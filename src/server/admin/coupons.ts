import "server-only";
import { Prisma, type CouponType } from "@prisma/client";
import { db } from "@/lib/db";
import { TABLE_PAGE_SIZE, type TableQuery } from "@/lib/table-params";

/**
 * Quản lý mã giảm giá.
 *
 * Luật xuyên suốt: **`usedCount` không phải là ô nhập.** Nó là số lần mã đã
 * thực sự được tiêu trong `consumeCoupon`, tăng bên trong transaction đặt đơn.
 * Cho sửa tay là mở đường cho một mã giới hạn 100 lượt bị dùng 300 lần mà sổ
 * vẫn ghi 100.
 *
 * Luật thứ hai: **mã đã dùng thì không xoá, chỉ tắt.** `Order.couponCode` là
 * snapshot chuỗi nên xoá không làm hỏng đơn cũ, nhưng lúc đối chiếu doanh thu
 * sẽ có một mã trong đơn mà không tra ra được điều kiện của nó.
 */

export class CouponCodeTakenError extends Error {
  constructor(code: string) {
    super(`Mã ${code} đã tồn tại.`);
    this.name = "CouponCodeTakenError";
  }
}

export class CouponInUseError extends Error {
  constructor(code: string, used: number) {
    super(`Mã ${code} đã được dùng ${used} lần nên không xoá được. Tắt nó đi thay vì xoá.`);
    this.name = "CouponInUseError";
  }
}

export class InvalidCouponError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidCouponError";
  }
}

export const COUPON_TYPE_LABEL: Record<CouponType, string> = {
  PERCENT: "Giảm %",
  FIXED: "Giảm tiền",
  FREESHIP: "Miễn phí ship",
};

export type CouponInput = {
  code: string;
  type: CouponType;
  value: number;
  minSubtotal: number;
  maxDiscount: number | null;
  usageLimit: number | null;
  perUserLimit: number | null;
  memberOnly: boolean;
  startsAt: Date;
  endsAt: Date;
  active: boolean;
};

/**
 * Kiểm điều kiện của một mã.
 *
 * Tách riêng vì cả tạo lẫn sửa đều cần, và vì đây là chỗ dễ đặt ra một mã vô
 * nghĩa nhất: giảm 150%, hạn kết thúc trước hạn bắt đầu, giảm tiền 0 đồng.
 */
function kiemTra(input: CouponInput) {
  if (!/^[A-Z0-9]{3,20}$/.test(input.code)) {
    throw new InvalidCouponError("Mã chỉ gồm chữ in hoa và số, dài 3–20 ký tự.");
  }
  if (input.endsAt <= input.startsAt) {
    throw new InvalidCouponError("Ngày kết thúc phải sau ngày bắt đầu.");
  }
  if (input.type === "PERCENT" && (input.value < 1 || input.value > 100)) {
    throw new InvalidCouponError("Giảm theo phần trăm phải nằm trong khoảng 1–100.");
  }
  if (input.type === "FIXED" && input.value < 1000) {
    throw new InvalidCouponError("Giảm tiền tối thiểu 1.000 ₫.");
  }
  if (input.minSubtotal < 0) throw new InvalidCouponError("Đơn tối thiểu không được âm.");
  if (input.usageLimit !== null && input.usageLimit < 1) {
    throw new InvalidCouponError("Giới hạn lượt dùng phải từ 1 trở lên.");
  }
  // Giảm tiền cố định mà chặn trần thấp hơn chính nó thì trần vô nghĩa.
  if (input.type === "FIXED" && input.maxDiscount !== null && input.maxDiscount < input.value) {
    throw new InvalidCouponError("Giảm tối đa không được nhỏ hơn số tiền giảm.");
  }
}

export async function createCoupon(input: CouponInput) {
  kiemTra(input);
  try {
    return await db.coupon.create({
      data: { ...input, code: input.code, usedCount: 0 },
      select: { id: true, code: true },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new CouponCodeTakenError(input.code);
    }
    throw e;
  }
}

/**
 * Sửa mã. `code` và `usedCount` **không** nằm trong danh sách sửa được: mã đã
 * phát ra ngoài rồi thì đổi ký tự là làm chết mã khách đang giữ, còn lượt dùng
 * thì xem đầu file.
 */
export async function updateCoupon(id: string, input: Omit<CouponInput, "code">) {
  const cu = await db.coupon.findUnique({ where: { id }, select: { code: true } });
  if (!cu) throw new InvalidCouponError("Không tìm thấy mã.");

  kiemTra({ ...input, code: cu.code });

  return db.coupon.update({
    where: { id },
    data: {
      type: input.type,
      value: input.value,
      minSubtotal: input.minSubtotal,
      maxDiscount: input.maxDiscount,
      usageLimit: input.usageLimit,
      perUserLimit: input.perUserLimit,
      memberOnly: input.memberOnly,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      active: input.active,
    },
    select: { id: true, code: true },
  });
}

/** Bật/tắt nhanh từ bảng, không phải mở form. */
export async function toggleCoupon(id: string, active: boolean) {
  return db.coupon.update({ where: { id }, data: { active }, select: { id: true, active: true } });
}

export async function deleteCoupon(id: string) {
  const c = await db.coupon.findUnique({
    where: { id },
    select: { code: true, usedCount: true },
  });
  if (!c) return;
  if (c.usedCount > 0) throw new CouponInUseError(c.code, c.usedCount);
  await db.coupon.delete({ where: { id } });
}

export async function getCoupon(id: string) {
  return db.coupon.findUnique({ where: { id } });
}

/**
 * Một mã đang chạy hay không phụ thuộc cả bốn thứ, không riêng cờ `active`:
 * còn bật, đã tới ngày, chưa quá hạn, chưa hết lượt.
 */
export function dangChay(c: {
  active: boolean;
  startsAt: Date;
  endsAt: Date;
  usageLimit: number | null;
  usedCount: number;
}, now = new Date()) {
  if (!c.active) return false;
  if (now < c.startsAt || now > c.endsAt) return false;
  if (c.usageLimit !== null && c.usedCount >= c.usageLimit) return false;
  return true;
}

const TABS = [
  { key: "", label: "Tất cả" },
  { key: "dang-chay", label: "Đang chạy" },
  { key: "het-han", label: "Hết hạn" },
] as const;

export async function listCoupons(q: TableQuery) {
  const where: Prisma.CouponWhereInput = q.q
    ? { code: { contains: q.q.trim(), mode: "insensitive" } }
    : {};

  const all = await db.coupon.findMany({ where, orderBy: { endsAt: "desc" } });
  const now = new Date();

  const loc =
    q.tab === "dang-chay"
      ? all.filter((c) => dangChay(c, now))
      : q.tab === "het-han"
        ? all.filter((c) => !dangChay(c, now))
        : all;

  const rows = loc.slice((q.trang - 1) * TABLE_PAGE_SIZE, q.trang * TABLE_PAGE_SIZE);

  return {
    rows,
    total: loc.length,
    tabs: TABS.map((t) => ({
      key: t.key,
      label: t.label,
      count:
        t.key === "dang-chay"
          ? all.filter((c) => dangChay(c, now)).length
          : t.key === "het-han"
            ? all.filter((c) => !dangChay(c, now)).length
            : all.length,
    })),
  };
}

export type CouponRow = Awaited<ReturnType<typeof listCoupons>>["rows"][number];
