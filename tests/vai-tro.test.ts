import { afterEach, describe, expect, it } from "vitest";
import { db } from "../src/lib/db";
import { khoaTuTen, laKhoaVaiTro, laNhanVien, nhanVaiTro } from "../src/lib/roles";
import { canDo, PERMISSION_KEYS } from "../src/lib/permissions";
import { getMatrix, setRolePermissions } from "../src/server/admin/permissions";
import {
  createRole,
  deleteRole,
  KhoaSaiDangError,
  KhoaTrungError,
  listRoles,
  updateRole,
  VaiTroDangDungError,
  VaiTroGocError,
} from "../src/server/admin/roles";
import { setUserRole } from "../src/server/admin/staff";

/**
 * Vai trò tự tạo — M6.22.
 *
 * `Role` từ enum thành bảng. Ba thứ đáng canh nhất, và cả ba đều dẫn tới mất
 * kiểm soát truy cập nếu buông:
 *
 *   1. **Vai trò gốc không xoá được** — seed và vài chỗ trong mã còn nhắc thẳng
 *      tên chúng.
 *   2. **Không xoá được vai trò còn người giữ** — xoá là đẩy họ vào trạng thái
 *      không có vai trò nào, mà `User.role` là khoá ngoại bắt buộc.
 *   3. **Vai trò mới chưa có quyền gì** — tạo xong mà tự có quyền là cấp quyền
 *      cho một thứ chưa ai tick.
 */

const rac: string[] = [];

afterEach(async () => {
  for (const k of rac) {
    await db.staffInvite.deleteMany({ where: { role: k } });
    await db.rolePermission.deleteMany({ where: { role: k } });
    await db.role.deleteMany({ where: { key: k } });
  }
  rac.length = 0;
});

async function vaiTroMoi(ten = "Trưởng ca") {
  const r = await createRole({ label: ten + " " + Date.now(), isStaff: true });
  rac.push(r.key);
  return r.key;
}

describe("khoá vai trò", () => {
  it("sinh khoá từ tên tiếng Việt, bỏ dấu và gạch dưới", () => {
    expect(khoaTuTen("Trưởng ca")).toBe("TRUONG_CA");
    expect(khoaTuTen("Nhân viên kho phụ")).toBe("NHAN_VIEN_KHO_PHU");
    expect(khoaTuTen("  Đội trưởng  ")).toBe("DOI_TRUONG");
  });

  it("chỉ nhận CHỮ_HOA_GACH_DƯỚI", () => {
    // Khoá nằm trong JWT và trong bảng phân quyền — nó là mã định danh, không
    // phải chữ để đọc.
    expect(laKhoaVaiTro("TRUONG_CA")).toBe(true);
    expect(laKhoaVaiTro("truong_ca")).toBe(false);
    expect(laKhoaVaiTro("Trưởng ca")).toBe(false);
    expect(laKhoaVaiTro("1CA")).toBe(false);
  });

  it("khoá trùng thì chặn", async () => {
    const key = await vaiTroMoi();
    const vt = await db.role.findUniqueOrThrow({ where: { key } });
    await expect(createRole({ label: vt.label, isStaff: true })).rejects.toBeInstanceOf(
      KhoaTrungError,
    );
  });

  it("khoá tự khai sai dạng thì chặn", async () => {
    await expect(
      createRole({ label: "Vai trò lạ", key: "sai dạng", isStaff: true }),
    ).rejects.toBeInstanceOf(KhoaSaiDangError);
  });
});

describe("tạo và sửa vai trò", () => {
  it("vai trò mới KHÔNG có quyền nào, và không phải vai trò gốc", async () => {
    const key = await vaiTroMoi();
    const m = await getMatrix();
    for (const k of PERMISSION_KEYS) expect(canDo(key, k, m)).toBe(false);

    const vt = await db.role.findUniqueOrThrow({ where: { key } });
    expect([vt.builtIn, vt.isSuper]).toEqual([false, false]);
  });

  it("tick quyền cho vai trò mới thì có tác dụng thật", async () => {
    const key = await vaiTroMoi();
    await setRolePermissions(key, ["kho.xem", "don.xem"]);

    const m = await getMatrix();
    expect(canDo(key, "kho.xem", m)).toBe(true);
    expect(canDo(key, "kho.ghi-so", m)).toBe(false);
  });

  it("đổi được nhãn, và nhãn mới hiện ra ngay", async () => {
    const key = await vaiTroMoi();
    await updateRole(key, { label: "Tên đã đổi", isStaff: true });

    const ds = await db.role.findMany();
    expect(nhanVaiTro(key, ds)).toBe("Tên đã đổi");
  });

  it("gỡ cờ nhân viên thì vai trò đó hết vào được khu quản trị", async () => {
    const key = await vaiTroMoi();
    await updateRole(key, { label: "Chỉ là khách", isStaff: false });

    const ds = await db.role.findMany();
    expect(laNhanVien(key, ds)).toBe(false);
  });

  it("KHÔNG gỡ được cờ nhân viên của vai trò siêu quyền", async () => {
    // Chủ cửa hàng mà không vào được khu quản trị thì không còn ai sửa được gì.
    const sieu = await db.role.findFirstOrThrow({ where: { isSuper: true } });
    await updateRole(sieu.key, { label: sieu.label, isStaff: false });

    const sau = await db.role.findUniqueOrThrow({ where: { key: sieu.key } });
    expect(sau.isStaff).toBe(true);
  });
});

describe("xoá vai trò", () => {
  it("CHẶN xoá vai trò gốc", async () => {
    for (const k of ["STAFF", "ADMIN", "CUSTOMER"]) {
      await expect(deleteRole(k)).rejects.toBeInstanceOf(VaiTroGocError);
    }
    expect(await db.role.count({ where: { builtIn: true } })).toBe(5);
  });

  it("CHẶN xoá vai trò còn người giữ", async () => {
    const key = await vaiTroMoi();
    const ai = await db.user.findFirstOrThrow({
      where: { roleRef: { isStaff: true, isSuper: false } },
      select: { id: true, role: true },
    });
    const cu = ai.role;
    await setUserRole(ai.id, key);

    await expect(deleteRole(key)).rejects.toBeInstanceOf(VaiTroDangDungError);

    await setUserRole(ai.id, cu);
  });

  it("xoá được vai trò chưa ai giữ, và quyền của nó đi theo", async () => {
    const key = await vaiTroMoi();
    await setRolePermissions(key, ["kho.xem"]);
    expect(await db.rolePermission.count({ where: { role: key } })).toBe(1);

    await deleteRole(key);
    expect(await db.role.findUnique({ where: { key } })).toBeNull();
    // `RolePermission` khai `onDelete: Cascade` nên dòng quyền đi theo.
    expect(await db.rolePermission.count({ where: { role: key } })).toBe(0);
    rac.length = 0;
  });
});

describe("danh sách vai trò kèm số người", () => {
  it("đếm đúng số người đang giữ từng vai trò", async () => {
    const ds = await listRoles();
    const admin = ds.find((r) => r.key === "ADMIN");
    const thuc = await db.user.count({ where: { role: "ADMIN" } });
    expect(admin?.soNguoi).toBe(thuc);
  });

  it("năm vai trò gốc luôn có mặt sau khi seed", async () => {
    const ds = await listRoles();
    const goc = ds.filter((r) => r.builtIn).map((r) => r.key).sort();
    expect(goc).toEqual(["ACCOUNTANT", "ADMIN", "CUSTOMER", "STAFF", "WAREHOUSE"]);
  });
});
