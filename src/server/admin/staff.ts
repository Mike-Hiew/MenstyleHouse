import "server-only";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

/**
 * Thành viên khu quản trị: mời, sửa, bật/tắt, xoá.
 *
 * **Tắt là thao tác chính, xoá là ngoại lệ.** Người đã phát hành hoá đơn hoặc
 * đã mời người khác thì xoá đi là làm mồ côi chứng từ; tắt giữ nguyên lịch sử
 * mà vẫn chặn đăng nhập ngay lập tức.
 *
 * Không có chỗ nào đọc hay đặt mật khẩu của người khác. Mời là gửi **đường dẫn
 * có token**, người được mời tự đặt mật khẩu — không ai phải đọc mật khẩu của
 * người khác qua điện thoại.
 */

const HAN_MOI_NGAY = 7;

export class LastAdminError extends Error {
  constructor() {
    super(
      "Đây là quản trị viên cuối cùng. Nâng một người khác lên quản trị trước khi hạ quyền hoặc tắt người này.",
    );
    this.name = "LastAdminError";
  }
}

export class EmailTakenError extends Error {
  constructor(email: string) {
    super(`${email} đã có tài khoản.`);
    this.name = "EmailTakenError";
  }
}

export class StaffInUseError extends Error {
  constructor(ly: string) {
    super(`Không xoá được: ${ly}. Tắt tài khoản thay vì xoá để giữ nguyên lịch sử.`);
    this.name = "StaffInUseError";
  }
}

export class InviteInvalidError extends Error {
  constructor(message = "Lời mời không hợp lệ hoặc đã hết hạn.") {
    super(message);
    this.name = "InviteInvalidError";
  }
}

/* ── Danh sách ────────────────────────────────────────────── */

export async function listStaff() {
  return db.user.findMany({
    // Ai là nhân viên giờ là **dữ liệu của vai trò**, không còn là danh sách
    // viết cứng — thêm một vai trò nhân viên là người mang nó hiện ra ngay.
    where: { roleRef: { isStaff: true } },
    orderBy: [{ active: "desc" }, { role: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      active: true,
      _count: { select: { invoicesIssued: true } },
    },
  });
}

export type StaffRow = Awaited<ReturnType<typeof listStaff>>[number];

export async function listInvites() {
  return db.staffInvite.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "desc" },
    select: { id: true, email: true, role: true, token: true, expiresAt: true },
  });
}

export type InviteRow = Awaited<ReturnType<typeof listInvites>>[number];

/* ── Đếm quản trị còn lại ─────────────────────────────────── */

/**
 * Số người mang **vai trò siêu quyền** và **đang bật**.
 *
 * Hỏi theo cờ `isSuper` chứ không theo tên `"ADMIN"`: cửa hàng đổi tên vai trò
 * chủ cửa hàng thì chốt chống tự khoá cửa vẫn phải giữ nguyên tác dụng. Quản trị
 * bị tắt không cứu được ai nên không tính.
 */
async function soAdminConLai(tru?: string) {
  return db.user.count({
    where: { roleRef: { isSuper: true }, active: true, ...(tru ? { id: { not: tru } } : {}) },
  });
}

/* ── Vai trò, bật/tắt, sửa, xoá ───────────────────────────── */

export async function setUserRole(id: string, role: string) {
  const [nguoi, moi] = await Promise.all([
    db.user.findUnique({
      where: { id },
      select: { active: true, roleRef: { select: { isSuper: true } } },
    }),
    db.role.findUnique({ where: { key: role }, select: { isSuper: true } }),
  ]);
  if (!nguoi) throw new Error("Không tìm thấy người dùng");
  if (!moi) throw new Error("Không tìm thấy vai trò " + role);

  // Theo cờ `isSuper`, không theo tên "ADMIN": cửa hàng đổi được nhãn vai trò,
  // mà chốt chống tự khoá cửa thì phải giữ nguyên tác dụng.
  if (nguoi.roleRef.isSuper && nguoi.active && !moi.isSuper) {
    if ((await soAdminConLai(id)) === 0) throw new LastAdminError();
  }

  return db.user.update({ where: { id }, data: { role }, select: { id: true, role: true } });
}

/**
 * Bật hoặc tắt tài khoản.
 *
 * Tắt có tác dụng ngay ở lần tải trang kế tiếp: `guard.ts` đọc lại `active` từ
 * DB mỗi lần chứ không tin JWT. Phiên đăng nhập sống hàng ngày, mà tắt một
 * tài khoản thì phải chặn được ngay chứ không đợi người đó tự đăng xuất.
 */
export async function setUserActive(id: string, active: boolean) {
  const nguoi = await db.user.findUnique({
    where: { id },
    select: { active: true, roleRef: { select: { isSuper: true } } },
  });
  if (!nguoi) throw new Error("Không tìm thấy người dùng");

  if (!active && nguoi.roleRef.isSuper && nguoi.active) {
    if ((await soAdminConLai(id)) === 0) throw new LastAdminError();
  }

  return db.user.update({ where: { id }, data: { active }, select: { id: true, active: true } });
}

export async function updateStaff(id: string, input: { name: string; email: string | null }) {
  if (input.email) {
    const trung = await db.user.findFirst({
      where: { email: input.email, id: { not: id } },
      select: { id: true },
    });
    if (trung) throw new EmailTakenError(input.email);
  }

  return db.user.update({
    where: { id },
    data: { name: input.name, email: input.email },
    select: { id: true },
  });
}

/** Xoá hẳn — chỉ khi người này chưa để lại dấu vết gì cần giữ. */
export async function deleteStaff(id: string) {
  const u = await db.user.findUnique({
    where: { id },
    select: {
      role: true,
      active: true,
      _count: { select: { invoicesIssued: true, orders: true, invitesSent: true } },
    },
  });
  if (!u) return;

  if (u.role === "ADMIN" && u.active && (await soAdminConLai(id)) === 0) {
    throw new LastAdminError();
  }
  if (u._count.invoicesIssued > 0) {
    throw new StaffInUseError(`người này đã phát hành ${u._count.invoicesIssued} hoá đơn`);
  }
  if (u._count.orders > 0) throw new StaffInUseError("người này có đơn hàng gắn với tài khoản");

  // Lời mời do người này gửi thì cắt liên kết, không xoá lây lịch sử mời.
  await db.staffInvite.updateMany({ where: { invitedById: id }, data: { invitedById: null } });
  await db.user.delete({ where: { id } });
}

/* ── Mời ──────────────────────────────────────────────────── */

export async function inviteStaff(input: { email: string; role: string; invitedById: string }) {
  const email = input.email.trim().toLowerCase();

  const daCo = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (daCo) throw new EmailTakenError(email);

  // Mời lại cùng email thì thu hồi lời mời cũ — chỉ một đường dẫn còn sống.
  await db.staffInvite.updateMany({
    where: { email, status: "PENDING" },
    data: { status: "REVOKED" },
  });

  const han = new Date();
  han.setDate(han.getDate() + HAN_MOI_NGAY);

  return db.staffInvite.create({
    data: {
      email,
      role: input.role,
      token: randomBytes(24).toString("base64url"),
      invitedById: input.invitedById,
      expiresAt: han,
    },
    select: { id: true, token: true, email: true, expiresAt: true },
  });
}

export async function revokeInvite(id: string) {
  await db.staffInvite.updateMany({ where: { id, status: "PENDING" }, data: { status: "REVOKED" } });
}

/** Đọc lời mời để dựng màn nhận lời mời. Hết hạn hay đã dùng đều coi như không có. */
export async function readInvite(token: string) {
  const m = await db.staffInvite.findUnique({
    where: { token },
    select: { id: true, email: true, role: true, status: true, expiresAt: true },
  });
  if (!m || m.status !== "PENDING" || m.expiresAt < new Date()) return null;
  return m;
}

/**
 * Người được mời đặt mật khẩu và tài khoản thành hình.
 *
 * Kiểm lại hạn và trạng thái **bên trong transaction**: giữa lúc mở trang và
 * lúc bấm nút, quản trị có thể đã thu hồi lời mời.
 */
export async function acceptInvite(input: { token: string; name: string; password: string }) {
  const hash = await bcrypt.hash(input.password, 10);

  return db.$transaction(async (tx) => {
    const m = await tx.staffInvite.findUnique({
      where: { token: input.token },
      select: { id: true, email: true, role: true, status: true, expiresAt: true },
    });
    if (!m || m.status !== "PENDING" || m.expiresAt < new Date()) throw new InviteInvalidError();

    const trung = await tx.user.findUnique({ where: { email: m.email }, select: { id: true } });
    if (trung) throw new InviteInvalidError(`${m.email} đã có tài khoản. Đăng nhập thay vì nhận lời mời.`);

    const u = await tx.user.create({
      data: {
        name: input.name.trim(),
        email: m.email,
        role: m.role,
        passwordHash: hash,
        active: true,
      },
      select: { id: true, email: true },
    });

    await tx.staffInvite.update({
      where: { id: m.id },
      data: { status: "ACCEPTED", acceptedAt: new Date() },
    });

    return u;
  });
}
