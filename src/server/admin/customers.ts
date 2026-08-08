import "server-only";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { tierFor, type Tier } from "@/lib/tiers";
// Cùng danh sách trạng thái với báo cáo và số "đã bán" ngoài trang chủ.
import { TINH_DA_BAN as TINH_CHI_TIEU } from "@/lib/order-status";
import { getSettings } from "@/server/settings";
import { TABLE_PAGE_SIZE, type TableQuery } from "@/lib/table-params";

/**
 * Hồ sơ khách hàng.
 *
 * Chi tiêu tính từ **đơn chưa huỷ, chưa trả hàng, trong 12 tháng gần nhất** —
 * cùng luật với báo cáo doanh thu. Nếu hai chỗ đếm khác nhau thì kế toán và
 * nhân viên bán hàng sẽ cãi nhau về cùng một con số.
 *
 * Ở đây **không** có đường đổi mật khẩu hay đọc mật khẩu của khách: nhân viên
 * không cần và không nên nhìn thấy nó.
 */


export class PhoneTakenError extends Error {
  constructor(phone: string) {
    super(`Số ${phone} đã có tài khoản.`);
    this.name = "PhoneTakenError";
  }
}

function mocTinh() {
  const d = new Date();
  d.setMonth(d.getMonth() - 12);
  return d;
}

export type CustomerRow = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  soDon: number;
  chiTieu: number;
  diem: number;
  hang: Tier;
};

/**
 * Danh sách khách kèm hạng.
 *
 * Gom chi tiêu bằng một `groupBy` rồi ghép trong JS, thay vì cho mỗi khách một
 * truy vấn: 500 khách là 500 vòng gọi DB cho một trang bảng.
 */
export async function listCustomers(q: TableQuery) {
  const tim = q.q.trim();
  const where: Prisma.UserWhereInput = {
    role: "CUSTOMER",
    ...(tim
      ? {
          OR: [
            { name: { contains: tim, mode: "insensitive" } },
            { phone: { contains: tim } },
            { email: { contains: tim, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (q.trang - 1) * TABLE_PAGE_SIZE,
      take: TABLE_PAGE_SIZE,
      select: { id: true, name: true, phone: true, email: true, pointBalance: true },
    }),
    db.user.count({ where }),
  ]);

  const nguong = await getSettings();

  const chiTieu = await db.order.groupBy({
    by: ["userId"],
    where: {
      userId: { in: users.map((u) => u.id) },
      status: { in: [...TINH_CHI_TIEU] },
      createdAt: { gte: mocTinh() },
    },
    _sum: { total: true },
    _count: { _all: true },
  });

  const theoNguoi = new Map(chiTieu.map((c) => [c.userId, c]));

  const rows: CustomerRow[] = users.map((u) => {
    const g = theoNguoi.get(u.id);
    const tien = g?._sum.total ?? 0;
    return {
      id: u.id,
      name: u.name,
      phone: u.phone,
      email: u.email,
      soDon: g?._count._all ?? 0,
      chiTieu: tien,
      diem: u.pointBalance,
      hang: tierFor(tien, nguong),
    };
  });

  return { rows, total };
}

/** Hồ sơ đầy đủ: đơn gần đây, sổ điểm, sổ địa chỉ. */
export async function getCustomer(id: string) {
  const user = await db.user.findFirst({
    where: { id, role: "CUSTOMER" },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      pointBalance: true,
      createdAt: true,
      addresses: {
        orderBy: { isDefault: "desc" },
        select: {
          id: true,
          label: true,
          receiver: true,
          phone: true,
          province: true,
          district: true,
          ward: true,
          street: true,
          isDefault: true,
        },
      },
      pointEntries: {
        orderBy: { createdAt: "desc" },
        take: 12,
        select: { id: true, delta: true, reason: true, note: true, createdAt: true },
      },
    },
  });
  if (!user) return null;

  const [orders, gom, nguong] = await Promise.all([
    db.order.findMany({
      where: { userId: id },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        code: true,
        status: true,
        paymentStatus: true,
        total: true,
        createdAt: true,
        _count: { select: { items: true } },
      },
    }),
    db.order.groupBy({
      by: ["userId"],
      where: { userId: id, status: { in: [...TINH_CHI_TIEU] }, createdAt: { gte: mocTinh() } },
      _sum: { total: true },
      _count: { _all: true },
    }),
    getSettings(),
  ]);

  const chiTieu = gom[0]?._sum.total ?? 0;

  return {
    ...user,
    orders,
    chiTieu,
    soDon: gom[0]?._count._all ?? 0,
    hang: tierFor(chiTieu, nguong),
  };
}

export type CustomerDetail = NonNullable<Awaited<ReturnType<typeof getCustomer>>>;

/**
 * Tạo tài khoản cho khách mua tại cửa hàng.
 *
 * Trả về **mật khẩu tạm** đúng một lần để nhân viên đọc cho khách. Không lưu
 * bản rõ ở đâu và không có màn nào xem lại: quên thì tạo lại mật khẩu, chứ
 * không phải tra ra mật khẩu cũ.
 */
export async function createCustomer(input: {
  name: string;
  phone: string;
  email: string | null;
}): Promise<{ id: string; matKhauTam: string }> {
  const trung = await db.user.findUnique({ where: { phone: input.phone }, select: { id: true } });
  if (trung) throw new PhoneTakenError(input.phone);

  // 8 ký tự, bỏ chữ dễ đọc nhầm khi đọc qua điện thoại (0/O, 1/l/I).
  const BANG = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
  const matKhauTam = Array.from(
    { length: 8 },
    () => BANG[Math.floor(Math.random() * BANG.length)],
  ).join("");

  const user = await db.user.create({
    data: {
      name: input.name,
      phone: input.phone,
      email: input.email,
      role: "CUSTOMER",
      passwordHash: await bcrypt.hash(matKhauTam, 10),
    },
    select: { id: true },
  });

  return { id: user.id, matKhauTam };
}
