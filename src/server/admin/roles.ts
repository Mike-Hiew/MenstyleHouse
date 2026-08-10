import "server-only";
import { z } from "zod";
import { db } from "@/lib/db";
import { khoaTuTen, laKhoaVaiTro } from "@/lib/roles";

/**
 * Quản lý vai trò.
 *
 * Ba thứ **không** cho đụng, mỗi thứ vì một lý do khác nhau:
 *
 * 1. **Khoá `key`** — đặt một lần lúc tạo. Nó nằm trong JWT của phiên đang mở,
 *    trong `RolePermission` và trong `StaffInvite`. Đổi khoá là mọi phiên đang
 *    đăng nhập trỏ vào một vai trò không còn tồn tại. Chỉ nhãn đổi được, và nhãn
 *    mới là thứ duy nhất người ta nhìn thấy.
 * 2. **Vai trò gốc** — không xoá được. Seed và vài chỗ trong mã còn nhắc thẳng
 *    tên chúng; đổi nhãn thì thoải mái.
 * 3. **Cờ `isSuper`** — không tạo thêm và không gỡ được. Chủ cửa hàng luôn có
 *    mọi khả năng, đó là chốt duy nhất chống tự khoá cửa: gỡ đúng
 *    `phan-quyen.quan-ly` khỏi mọi vai trò thì không còn ai vào được màn phân
 *    quyền để sửa lại.
 */

export const vaiTroSchema = z.object({
  label: z.string().trim().min(2, "Nhập tên vai trò").max(60),
  /** Vào được khu quản trị. Bỏ tick là vai trò của khách mua hàng. */
  isStaff: z.coerce.boolean().optional(),
});

export type VaiTroInput = z.infer<typeof vaiTroSchema>;

export const taoVaiTroSchema = vaiTroSchema.extend({
  /** Bỏ trống thì sinh từ tên: "Trưởng ca" → "TRUONG_CA". */
  key: z.string().trim().max(30).optional(),
});

export class KhoaTrungError extends Error {
  constructor(key: string) {
    super(`Đã có vai trò mang khoá ${key}. Đặt tên khác hoặc khai khoá riêng.`);
    this.name = "KhoaTrungError";
  }
}

export class KhoaSaiDangError extends Error {
  constructor() {
    super("Khoá vai trò viết CHỮ_HOA_GACH_DƯỚI, bắt đầu bằng chữ cái, tối đa 30 ký tự.");
    this.name = "KhoaSaiDangError";
  }
}

export class VaiTroGocError extends Error {
  constructor(label: string) {
    super(`${label} là vai trò gốc nên không xoá được. Đổi tên thì vẫn được.`);
    this.name = "VaiTroGocError";
  }
}

export class VaiTroDangDungError extends Error {
  constructor(label: string, soNguoi: number, soLoiMoi: number) {
    const ve = [
      soNguoi > 0 ? `${soNguoi} người` : null,
      soLoiMoi > 0 ? `${soLoiMoi} lời mời chưa nhận` : null,
    ]
      .filter(Boolean)
      .join(" và ");
    super(`${label} đang gắn với ${ve}. Chuyển họ sang vai trò khác rồi mới xoá được.`);
    this.name = "VaiTroDangDungError";
  }
}

/* ── Đọc ──────────────────────────────────────────────────── */

export async function listRoles() {
  const [roles, nguoi, moi] = await Promise.all([
    db.role.findMany({ orderBy: [{ sort: "asc" }, { key: "asc" }] }),
    db.user.groupBy({ by: ["role"], _count: true }),
    db.staffInvite.groupBy({ by: ["role"], where: { status: "PENDING" }, _count: true }),
  ]);

  const demNguoi = new Map(nguoi.map((x) => [x.role, x._count]));
  const demMoi = new Map(moi.map((x) => [x.role, x._count]));

  return roles.map((r) => ({
    ...r,
    soNguoi: demNguoi.get(r.key) ?? 0,
    soLoiMoi: demMoi.get(r.key) ?? 0,
  }));
}

export type VaiTroRow = Awaited<ReturnType<typeof listRoles>>[number];

/* ── Ghi ──────────────────────────────────────────────────── */

export async function createRole(input: z.infer<typeof taoVaiTroSchema>) {
  const key = (input.key?.trim() || khoaTuTen(input.label)).toUpperCase();
  if (!laKhoaVaiTro(key)) throw new KhoaSaiDangError();

  if (await db.role.findUnique({ where: { key }, select: { key: true } })) {
    throw new KhoaTrungError(key);
  }

  const cuoi = await db.role.findFirst({ orderBy: { sort: "desc" }, select: { sort: true } });

  return db.role.create({
    data: {
      key,
      label: input.label,
      isStaff: Boolean(input.isStaff),
      // `isSuper` và `builtIn` không nhận từ ngoài vào: cả hai là thuộc tính của
      // hệ thống chứ không phải lựa chọn của người dùng.
      isSuper: false,
      builtIn: false,
      sort: (cuoi?.sort ?? -1) + 1,
    },
    select: { key: true },
  });
}

/**
 * Sửa vai trò — **chỉ nhãn và cờ nhân viên**, không đụng khoá.
 *
 * Vai trò siêu quyền không gỡ được cờ nhân viên: chủ cửa hàng mà không vào được
 * khu quản trị thì không còn ai sửa được gì nữa.
 */
export async function updateRole(key: string, input: VaiTroInput) {
  const vt = await db.role.findUnique({ where: { key }, select: { isSuper: true } });
  if (!vt) throw new Error("Không tìm thấy vai trò " + key);

  return db.role.update({
    where: { key },
    data: {
      label: input.label,
      isStaff: vt.isSuper ? true : Boolean(input.isStaff),
    },
    select: { key: true },
  });
}

export async function deleteRole(key: string) {
  const vt = await db.role.findUnique({
    where: { key },
    select: {
      label: true,
      builtIn: true,
      _count: { select: { users: true, invites: true } },
    },
  });
  if (!vt) return;

  if (vt.builtIn) throw new VaiTroGocError(vt.label);

  const loiMoiCho = await db.staffInvite.count({ where: { role: key, status: "PENDING" } });
  if (vt._count.users > 0 || loiMoiCho > 0) {
    throw new VaiTroDangDungError(vt.label, vt._count.users, loiMoiCho);
  }

  /*
   * Lời mời đã nhận hoặc đã thu hồi vẫn trỏ vào vai trò này, và `StaffInvite`
   * khai `RESTRICT` nên xoá thẳng sẽ đâm ràng buộc. Chúng chỉ là lịch sử của
   * một lời mời đã xong việc — dọn theo, còn quyền của vai trò thì `CASCADE` tự
   * lo.
   */
  await db.$transaction([
    db.staffInvite.deleteMany({ where: { role: key } }),
    db.role.delete({ where: { key } }),
  ]);
}
