import { afterEach, describe, expect, it } from "vitest";
import {
  canDo,
  isPermissionKey,
  MA_TRAN_MAC_DINH,
  PERMISSION_KEYS,
  permissionGroups,
  SIEU_QUYEN,
} from "../src/lib/permissions";
import {
  CannotEditAdminError,
  getMatrix,
  setRolePermissions,
} from "../src/server/admin/permissions";
import {
  acceptInvite,
  deleteStaff,
  EmailTakenError,
  InviteInvalidError,
  inviteStaff,
  LastAdminError,
  listStaff,
  readInvite,
  revokeInvite,
  setUserActive,
  setUserRole,
  StaffInUseError,
} from "../src/server/admin/staff";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ADMIN_NAV } from "../src/components/admin/admin-nav";
import { db } from "../src/lib/db";

/**
 * Phân quyền theo khả năng.
 *
 * Ba chỗ hỏng thì mất kiểm soát truy cập:
 *   1. ADMIN bị gỡ quyền → không ai vào được màn phân quyền để sửa lại.
 *   2. Hạ hoặc tắt người quản trị cuối cùng → khoá cửa từ bên trong.
 *   3. Lời mời dùng lại được hoặc không hết hạn.
 */

const rac: string[] = [];
const racMoi: string[] = [];

afterEach(async () => {
  await db.staffInvite.deleteMany({ where: { id: { in: racMoi } } });
  await db.staffInvite.deleteMany({ where: { email: { contains: "kiemthu" } } });
  await db.user.deleteMany({ where: { id: { in: rac } } });
  rac.length = 0;
  racMoi.length = 0;
});

describe("danh mục khả năng", () => {
  it("mọi khoá trong ma trận mặc định đều là khoá có thật", () => {
    // Gõ sai một khoá ở đây là cấp một quyền không chặn gì cả.
    for (const keys of Object.values(MA_TRAN_MAC_DINH)) {
      for (const k of keys) expect(isPermissionKey(k)).toBe(true);
    }
  });

  it("không có khoá trùng, và nhóm phủ hết danh mục", () => {
    expect(new Set(PERMISSION_KEYS).size).toBe(PERMISSION_KEYS.length);
    const trongNhom = permissionGroups().flatMap((g) => g.items.map((i) => i.key));
    expect(new Set(trongNhom)).toEqual(new Set(PERMISSION_KEYS));
  });
});

describe("chủ cửa hàng luôn có mọi quyền", () => {
  it("canDo trả true cho ADMIN kể cả khi ma trận rỗng", () => {
    for (const k of PERMISSION_KEYS) expect(canDo(SIEU_QUYEN, k, {})).toBe(true);
  });

  it("không ghi được quyền cho ADMIN", async () => {
    await expect(setRolePermissions(SIEU_QUYEN, ["don.xem"])).rejects.toBeInstanceOf(
      CannotEditAdminError,
    );
  });

  it("vai trò khác thì đọc đúng ma trận", async () => {
    const m = await getMatrix();
    expect(canDo("ACCOUNTANT", "hoa-don.phat-hanh", m)).toBe(true);
    expect(canDo("ACCOUNTANT", "kho.ghi-so", m)).toBe(false);
    expect(canDo("WAREHOUSE", "kho.ghi-so", m)).toBe(true);
    expect(canDo("WAREHOUSE", "hoa-don.phat-hanh", m)).toBe(false);
  });
});

describe("ghi ma trận", () => {
  it("ghi đè trọn vẹn, bỏ tick là mất quyền", async () => {
    const cu = (await getMatrix()).WAREHOUSE ?? [];
    await setRolePermissions("WAREHOUSE", ["kho.xem"]);

    const rows = await db.rolePermission.findMany({ where: { role: "WAREHOUSE" } });
    expect(rows.map((r) => r.permission)).toEqual(["kho.xem"]);

    await setRolePermissions("WAREHOUSE", cu);
  });

  it("bỏ qua khoá lạ thay vì lưu rác", async () => {
    const cu = (await getMatrix()).STAFF ?? [];
    await setRolePermissions("STAFF", ["don.xem", "khong-co-that", "don.xem"]);

    const rows = await db.rolePermission.findMany({ where: { role: "STAFF" } });
    expect(rows.map((r) => r.permission)).toEqual(["don.xem"]);

    await setRolePermissions("STAFF", cu);
  });
});

async function nhanVienMoi(role: "STAFF" | "ADMIN" = "STAFF", active = true) {
  const rieng = Math.abs(Number(process.hrtime.bigint() % 100000000n));
  const u = await db.user.create({
    data: {
      name: "NV kiểm thử " + rieng,
      email: `kiemthu${rieng}@menstylehouse.vn`,
      role,
      active,
      passwordHash: "x",
    },
    select: { id: true, email: true },
  });
  rac.push(u.id);
  return u;
}

describe("quản trị viên cuối cùng", () => {
  it("không hạ vai trò được", async () => {
    const admins = await db.user.findMany({
      where: { role: "ADMIN", active: true },
      select: { id: true },
    });
    for (const a of admins.slice(1)) await setUserRole(a.id, "STAFF");

    await expect(setUserRole(admins[0].id, "STAFF")).rejects.toBeInstanceOf(LastAdminError);

    for (const a of admins.slice(1)) await setUserRole(a.id, "ADMIN");
  });

  it("không tắt được", async () => {
    const admins = await db.user.findMany({
      where: { role: "ADMIN", active: true },
      select: { id: true },
    });
    for (const a of admins.slice(1)) await setUserActive(a.id, false);

    await expect(setUserActive(admins[0].id, false)).rejects.toBeInstanceOf(LastAdminError);

    for (const a of admins.slice(1)) await setUserActive(a.id, true);
  });

  it("quản trị đã tắt không tính là người còn lại", async () => {
    // Có hai admin nhưng một người đã tắt, nên người còn lại vẫn là cuối cùng.
    const them = await nhanVienMoi("ADMIN", false);
    const dangBat = await db.user.findFirstOrThrow({
      where: { role: "ADMIN", active: true, id: { not: them.id } },
      select: { id: true },
    });
    await expect(setUserActive(dangBat.id, false)).rejects.toBeInstanceOf(LastAdminError);
  });
});

describe("xoá và tắt thành viên", () => {
  it("người đã phát hành hoá đơn thì không xoá, chỉ tắt", async () => {
    const nv = await nhanVienMoi();
    const don = await db.order.findFirstOrThrow({ where: { invoice: null }, select: { id: true } });
    const hd = await db.invoice.create({
      data: {
        orderId: don.id,
        symbol: "1C26TMS",
        number: "9" + String(Math.abs(Number(process.hrtime.bigint() % 10000000n))).padStart(7, "0"),
        buyerName: "Kiểm thử",
        buyerAddr: "1 Test",
        netAmount: 100,
        vatAmount: 8,
        grossAmount: 108,
        issuedById: nv.id,
      },
      select: { id: true },
    });

    await expect(deleteStaff(nv.id)).rejects.toBeInstanceOf(StaffInUseError);
    await expect(setUserActive(nv.id, false)).resolves.toMatchObject({ active: false });

    await db.invoice.delete({ where: { id: hd.id } });
  });

  it("người chưa để lại gì thì xoá được", async () => {
    const nv = await nhanVienMoi();
    await deleteStaff(nv.id);
    expect(await db.user.findUnique({ where: { id: nv.id } })).toBeNull();
    rac.length = 0;
  });

  it("danh sách gồm cả người đã tắt, xếp người đang bật lên trước", async () => {
    const tat = await nhanVienMoi("STAFF", false);
    const ds = await listStaff();
    expect(ds.map((m) => m.id)).toContain(tat.id);
    const viTri = ds.findIndex((m) => m.id === tat.id);
    expect(ds.slice(0, viTri).every((m) => m.active)).toBe(true);
  });
});

describe("lời mời", () => {
  const emailMoi = () =>
    `kiemthu${Math.abs(Number(process.hrtime.bigint() % 100000000n))}@msh.vn`;
  const adminId = async () =>
    (await db.user.findFirstOrThrow({ where: { role: "ADMIN" }, select: { id: true } })).id;

  it("tạo được lời mời có hạn, đọc lại đúng vai trò", async () => {
    const m = await inviteStaff({
      email: emailMoi(),
      role: "ACCOUNTANT",
      invitedById: await adminId(),
    });
    racMoi.push(m.id);

    expect((await readInvite(m.token))?.role).toBe("ACCOUNTANT");
    expect(m.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it("mời lại cùng email thì thu hồi lời mời cũ — chỉ một đường dẫn còn sống", async () => {
    const email = emailMoi();
    const id = await adminId();

    const cu = await inviteStaff({ email, role: "STAFF", invitedById: id });
    const moi = await inviteStaff({ email, role: "STAFF", invitedById: id });
    racMoi.push(cu.id, moi.id);

    expect(await readInvite(cu.token)).toBeNull();
    expect(await readInvite(moi.token)).not.toBeNull();
  });

  it("email đã có tài khoản thì không mời được", async () => {
    const nv = await nhanVienMoi();
    await expect(
      inviteStaff({ email: nv.email!, role: "STAFF", invitedById: await adminId() }),
    ).rejects.toBeInstanceOf(EmailTakenError);
  });

  it("nhận lời mời tạo tài khoản đúng email và vai trò đã mời", async () => {
    const email = emailMoi();
    const m = await inviteStaff({ email, role: "WAREHOUSE", invitedById: await adminId() });
    racMoi.push(m.id);

    const u = await acceptInvite({ token: m.token, name: "Người mới", password: "matkhau123" });
    rac.push(u.id);

    const trongDb = await db.user.findUniqueOrThrow({ where: { id: u.id } });
    expect(trongDb.email).toBe(email);
    expect(trongDb.role).toBe("WAREHOUSE");
    expect(trongDb.active).toBe(true);
    // Mật khẩu lưu dạng băm, không ai đọc lại được.
    expect(trongDb.passwordHash).toBeTruthy();
    expect(trongDb.passwordHash).not.toBe("matkhau123");
  });

  it("dùng lại token lần hai bị chặn", async () => {
    const m = await inviteStaff({ email: emailMoi(), role: "STAFF", invitedById: await adminId() });
    racMoi.push(m.id);

    const u = await acceptInvite({ token: m.token, name: "A", password: "matkhau123" });
    rac.push(u.id);

    await expect(
      acceptInvite({ token: m.token, name: "B", password: "matkhau123" }),
    ).rejects.toBeInstanceOf(InviteInvalidError);
  });

  it("thu hồi rồi thì token chết", async () => {
    const m = await inviteStaff({ email: emailMoi(), role: "STAFF", invitedById: await adminId() });
    racMoi.push(m.id);

    await revokeInvite(m.id);

    expect(await readInvite(m.token)).toBeNull();
    await expect(
      acceptInvite({ token: m.token, name: "A", password: "matkhau123" }),
    ).rejects.toBeInstanceOf(InviteInvalidError);
  });

  it("lời mời hết hạn không dùng được", async () => {
    const m = await inviteStaff({ email: emailMoi(), role: "STAFF", invitedById: await adminId() });
    racMoi.push(m.id);

    await db.staffInvite.update({
      where: { id: m.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    expect(await readInvite(m.token)).toBeNull();
  });
});

describe("không trang quản trị nào để hở", () => {
  /**
   * Quét mã nguồn thay vì tin vào trí nhớ.
   *
   * Trước M6.8 có **tám** trang chỉ dựa vào guard ở layout — thứ chỉ kiểm "có
   * phải nhân viên không". Kế toán mở thẳng `/admin/nhap-kho` là vào được màn
   * ghi sổ kho. Sidebar có ẩn mục đó, nhưng ẩn nút không phải là kiểm soát.
   *
   * Bài test này chạy trên **file**, nên thêm một trang quản trị mới mà quên
   * chốt chặn là đỏ ngay, không đợi ai nhớ ra.
   */
  const doc = (p: string) => readFileSync(p, "utf8");
  /** Windows trả về dấu gạch ngược; so sánh đường dẫn thì đưa về một dạng. */
  const chuanHoa = (p: string) => p.split("\\").join("/");

  const trangAdmin = () => {
    const ra: string[] = [];
    const di = (thuMuc: string) => {
      for (const t of readdirSync(thuMuc, { withFileTypes: true })) {
        const p = join(thuMuc, t.name);
        if (t.isDirectory()) di(p);
        else if (t.name === "page.tsx") ra.push(p);
      }
    };
    di(join(process.cwd(), "src", "app", "admin"));
    return ra;
  };

  it("mọi trang quản trị đều gọi requirePermission", () => {
    const hoTrong = trangAdmin().filter((p) => {
      // `/admin` là bảng tổng quan: mọi nhân viên vào được, layout đã chặn khách.
      if (chuanHoa(p).endsWith("app/admin/page.tsx")) return false;
      return !doc(p).includes("requirePermission(");
    });

    expect(hoTrong.map((p) => chuanHoa(p).split("/app/")[1])).toEqual([]);
  });

  it("mọi mục sidebar trừ Tổng quan đều khai khả năng cần có", () => {
    // Mục thiếu `can` thì ai cũng thấy — đúng lỗi đã xảy ra với "Danh mục".
    const thieu = ADMIN_NAV.filter((n) => n.href !== "/admin" && !n.can);
    expect(thieu.map((n) => n.label)).toEqual([]);
  });

  it("khả năng dùng ở sidebar và ở trang đều là khoá có thật", () => {
    for (const n of ADMIN_NAV) if (n.can) expect(isPermissionKey(n.can)).toBe(true);

    const dungTrongTrang = trangAdmin()
      .flatMap((p) => [...doc(p).matchAll(/requirePermission\("([^"]+)"\)/g)].map((m) => m[1]));
    expect(dungTrongTrang.length).toBeGreaterThan(0);
    for (const k of dungTrongTrang) expect(isPermissionKey(k)).toBe(true);
  });
});
