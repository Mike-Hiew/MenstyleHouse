"use client";

import * as React from "react";
import { useActionState } from "react";
import { cn } from "@/lib/cn";
import { nhanVaiTro, type VaiTro } from "@/lib/roles";
import { VaiTroPanel, type VaiTroDong } from "./vai-tro-panel";
import { permissionGroups, type PermissionKey } from "@/lib/permissions";
import {
  inviteStaffAction,
  saveRolePermissionsAction,
  staffAction,
  type AdminActionState,
  type InviteState,
} from "@/app/admin/actions";

export type StaffMember = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string;
  active: boolean;
  soHoaDon: number;
};

export type PendingInvite = {
  id: string;
  email: string;
  role: string;
  token: string;
  expiresAt: Date;
};


/**
 * Hai phần tách bạch:
 *
 * 1. **Thành viên** — ai đang ở trong, giữ vai trò nào, bật hay tắt.
 * 2. **Vai trò làm được gì** — ma trận vai trò × khả năng.
 *
 * Tách ra vì hai câu hỏi khác nhau: "cho anh này vai trò nào" và "vai trò kế
 * toán được đụng tới đâu". Trộn chung một bảng thì mỗi lần sửa quyền của một
 * vai trò lại phải tìm trong danh sách người.
 */
export function StaffRoles({
  members,
  invites,
  matrix,
  roles,
  meId,
}: {
  members: StaffMember[];
  invites: PendingInvite[];
  matrix: Record<string, PermissionKey[]>;
  /** Danh sách vai trò đọc từ DB — không còn hằng số nào trong file này. */
  roles: VaiTroDong[];
  meId: string;
}) {
  return (
    <div className="flex flex-col gap-10">
      <VaiTroPanel roles={roles} />
      <ThanhVien members={members} invites={invites} roles={roles} meId={meId} />
      <MaTran matrix={matrix} roles={roles} />
    </div>
  );
}

/* ── Phần 1: thành viên ───────────────────────────────────── */

function ThanhVien({
  members,
  invites,
  roles,
  meId,
}: {
  members: StaffMember[];
  invites: PendingInvite[];
  roles: VaiTro[];
  meId: string;
}) {
  const [state, chay, pending] = useActionState<AdminActionState, FormData>(staffAction, {});
  const [moi, moiChay, dangMoi] = useActionState<InviteState, FormData>(inviteStaffAction, {});
  const [suaId, setSuaId] = React.useState<string | null>(null);

  const notice = state.message ?? moi.message;
  const noticeOk = state.message ? state.ok : moi.ok;

  return (
    <section className="border-t-2 border-divider pt-3.5">
      <h2 className="mb-1 text-[19px]">Thành viên</h2>
      <p className="mb-4 text-[13px] text-muted">
        Ai đang ở trong khu quản trị và giữ vai trò nào. Tắt tài khoản có tác dụng ngay ở lần tải
        trang kế tiếp.
      </p>

      {notice ? (
        <p
          role="alert"
          className={cn(
            "mb-4 border-2 px-3.5 py-2.5 text-[13px] font-semibold",
            noticeOk ? "border-divider bg-subtle" : "border-accent bg-accent-100 text-accent-800",
          )}
        >
          {notice}
        </p>
      ) : null}

      {moi.duongDan ? (
        <div className="mb-4 border-2 border-divider bg-subtle p-4">
          <p className="label-tech mb-2 font-bold">ĐƯỜNG DẪN MỜI — GỬI CHO NGƯỜI ĐƯỢC MỜI</p>
          <p className="break-all font-mono text-[13px]">
            {typeof window !== "undefined" ? window.location.origin : ""}
            {moi.duongDan}
          </p>
          <p className="mt-2 text-[12px] leading-[1.6] text-faint">
            Chưa có hệ thống gửi mail nên bạn tự gửi đường dẫn này. Người kia tự đặt mật khẩu, hết
            hạn sau 7 ngày.
          </p>
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[13.5px]">
          <thead>
            <tr>
              {["THÀNH VIÊN", "EMAIL", "VAI TRÒ", "TRẠNG THÁI", ""].map((h, i) => (
                <th
                  key={h || i}
                  className="label-tech whitespace-nowrap border-b-2 border-divider py-2 pr-3 text-left font-bold text-faint"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {members.map((m) => {
              const toi = m.id === meId;
              return (
                <tr key={m.id} className={cn(!m.active && "opacity-55")}>
                  <td className="border-b border-hairline py-2.5 pr-3">
                    {suaId === m.id ? (
                      <form action={chay} id={"sua-" + m.id} className="flex flex-col gap-1.5">
                        <input type="hidden" name="viec" value="sua" />
                        <input type="hidden" name="id" value={m.id} />
                        <input name="name" defaultValue={m.name} className={o} />
                      </form>
                    ) : (
                      <>
                        <span className="font-semibold">{m.name}</span>
                        {toi ? <span className="ml-2 text-[12px] text-faint">(bạn)</span> : null}
                        {m.phone ? (
                          <span className="ml-2 font-mono text-[12px] text-faint">{m.phone}</span>
                        ) : null}
                      </>
                    )}
                  </td>

                  <td className="border-b border-hairline py-2.5 pr-3 text-[13px] text-muted">
                    {suaId === m.id ? (
                      <input
                        form={"sua-" + m.id}
                        name="email"
                        defaultValue={m.email ?? ""}
                        className={o}
                      />
                    ) : (
                      (m.email ?? "—")
                    )}
                  </td>

                  <td className="border-b border-hairline py-2.5 pr-3">
                    {toi ? (
                      <span className="bg-accent px-2 py-1 text-[11px] font-extrabold text-bg">
                        {nhanVaiTro(m.role, roles)}
                      </span>
                    ) : (
                      <form action={chay} className="flex items-center gap-2">
                        <input type="hidden" name="viec" value="doi-vai-tro" />
                        <input type="hidden" name="id" value={m.id} />
                        <select name="role" defaultValue={m.role} className={cn(o, "min-h-11")}>
                          {roles.map((r) => (
                            <option key={r.key} value={r.key}>
                              {r.label}
                            </option>
                          ))}
                        </select>
                        <button
                          type="submit"
                          disabled={pending}
                          className="min-h-11 text-[12.5px] font-extrabold text-accent disabled:opacity-60"
                        >
                          Lưu
                        </button>
                      </form>
                    )}
                  </td>

                  <td className="border-b border-hairline py-2.5 pr-3">
                    <span
                      className={cn(
                        "px-2 py-1 text-[11px] font-extrabold",
                        m.active ? "bg-subtle" : "bg-neutral-900 text-bg",
                      )}
                    >
                      {m.active ? "ĐANG BẬT" : "ĐÃ TẮT"}
                    </span>
                  </td>

                  <td className="whitespace-nowrap border-b border-hairline py-2.5 text-right">
                    {suaId === m.id ? (
                      <>
                        <button
                          type="submit"
                          form={"sua-" + m.id}
                          className="mr-3 min-h-11 text-[12.5px] font-extrabold text-accent"
                        >
                          Lưu
                        </button>
                        <button
                          type="button"
                          onClick={() => setSuaId(null)}
                          className="min-h-11 text-[12.5px] text-faint underline"
                        >
                          Thôi
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => setSuaId(m.id)}
                          className="mr-3 min-h-11 text-[12.5px] text-faint underline"
                        >
                          Sửa
                        </button>
                        {toi ? null : (
                          <>
                            <form action={chay} className="mr-3 inline">
                              <input type="hidden" name="viec" value={m.active ? "tat" : "bat"} />
                              <input type="hidden" name="id" value={m.id} />
                              <button
                                type="submit"
                                className="min-h-11 text-[12.5px] font-extrabold text-accent"
                              >
                                {m.active ? "Tắt" : "Bật"}
                              </button>
                            </form>
                            {m.soHoaDon > 0 ? (
                              <span className="text-[12px] text-faint">đã có hoá đơn</span>
                            ) : (
                              <form action={chay} className="inline">
                                <input type="hidden" name="viec" value="xoa" />
                                <input type="hidden" name="id" value={m.id} />
                                <button
                                  type="submit"
                                  className="min-h-11 text-[12px] text-faint underline"
                                >
                                  Xoá
                                </button>
                              </form>
                            )}
                          </>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {invites.length > 0 ? (
        <div className="mt-5">
          <p className="label-tech mb-2 font-bold">LỜI MỜI ĐANG CHỜ</p>
          <ul className="flex flex-col gap-2">
            {invites.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center gap-3 text-[13px]">
                <span className="font-semibold">{i.email}</span>
                <span className="text-muted">{nhanVaiTro(i.role, roles)}</span>
                <span className="label-tech">
                  hết hạn {new Date(i.expiresAt).toLocaleDateString("vi-VN")}
                </span>
                <form action={chay}>
                  <input type="hidden" name="viec" value="thu-hoi-moi" />
                  <input type="hidden" name="id" value={i.id} />
                  <button type="submit" className="min-h-11 text-[12px] text-faint underline">
                    Thu hồi
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <form action={moiChay} className="mt-5 flex flex-wrap items-end gap-3 border-t border-hairline pt-4">
        <label className="block flex-1 sm:max-w-[300px]">
          <span className="mb-1.5 block text-[12px] font-semibold">Mời qua email</span>
          <input name="email" type="email" required placeholder="nhanvien@menstylehouse.vn" className={o} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[12px] font-semibold">Vai trò</span>
          <select name="role" defaultValue="STAFF" className={cn(o, "min-h-12")}>
            {roles
              .filter((r) => r.isStaff)
              .map((r) => (
                <option key={r.key} value={r.key}>
                  {r.label}
                </option>
              ))}
          </select>
        </label>
        <button
          type="submit"
          disabled={dangMoi}
          className="min-h-12 bg-accent px-5 text-[13.5px] font-extrabold text-bg disabled:opacity-60"
        >
          {dangMoi ? "Đang tạo…" : "MỜI THÀNH VIÊN"}
        </button>
      </form>
    </section>
  );
}

/* ── Phần 2: vai trò làm được gì ──────────────────────────── */

function MaTran({
  matrix,
  roles,
}: {
  matrix: Record<string, PermissionKey[]>;
  roles: VaiTro[];
}) {
  const [state, luu, pending] = useActionState<AdminActionState, FormData>(
    saveRolePermissionsAction,
    {},
  );
  /*
   * Chỉ vai trò **nhân viên và không siêu quyền** mới sửa được ma trận: khách hàng
   * không vào khu quản trị nên tick gì cũng vô nghĩa, còn chủ cửa hàng luôn có mọi
   * quyền — cho bỏ tick là mở đường tự khoá cửa.
   */
  const suaDuoc = roles.filter((r) => r.isStaff && !r.isSuper);
  const sieu = roles.find((r) => r.isSuper);

  const [role, setRole] = React.useState<string>(() => suaDuoc[0]?.key ?? "");

  const dangCo = new Set(matrix[role] ?? []);

  return (
    <section className="border-t-2 border-divider pt-3.5">
      <h2 className="mb-1 text-[19px]">Vai trò làm được gì</h2>
      <p className="mb-4 text-[13px] leading-[1.7] text-muted">
        Mỗi ô tick là một chốt chặn có thật ở server, không phải chỉ ẩn nút. Bỏ tick thì người giữ
        vai trò đó mở thẳng đường dẫn cũng bị chặn.
      </p>

      {state.message ? (
        <p
          role="alert"
          className={cn(
            "mb-4 border-2 px-3.5 py-2.5 text-[13px] font-semibold",
            state.ok ? "border-divider bg-subtle" : "border-accent bg-accent-100 text-accent-800",
          )}
        >
          {state.message}
        </p>
      ) : null}

      <div className="mb-4 flex flex-wrap gap-2">
        {suaDuoc.map((r) => (
          <button
            key={r.key}
            type="button"
            onClick={() => setRole(r.key)}
            className={cn(
              "min-h-11 border-2 px-4 text-[13px] font-extrabold",
              role === r.key ? "border-accent bg-accent-100" : "border-border-soft",
            )}
          >
            {r.label}
          </button>
        ))}
        {sieu ? (
          <span className="flex min-h-11 items-center border-2 border-dashed border-border-soft px-4 text-[12.5px] text-faint">
            {sieu.label} luôn có mọi quyền
          </span>
        ) : null}
      </div>

      {/* `key` để đổi vai trò là các ô tick nạp lại theo vai trò mới. */}
      <form action={luu} key={role}>
        <input type="hidden" name="role" value={role} />

        <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
          {permissionGroups().map((g) => (
            <fieldset key={g.group}>
              <legend className="label-tech mb-2 font-bold text-faint">
                {g.group.toUpperCase()}
              </legend>
              <div className="flex flex-col gap-2">
                {g.items.map((it) => (
                  <label key={it.key} className="flex cursor-pointer items-start gap-2.5 text-[13.5px]">
                    <input
                      type="checkbox"
                      name="perm"
                      value={it.key}
                      defaultChecked={dangCo.has(it.key)}
                      className="mt-0.5 h-4 w-4 accent-accent"
                    />
                    <span className="flex-1">
                      {it.label}
                      <span className="ml-1.5 font-mono text-[11px] text-faint">{it.key}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
        </div>

        <button
          type="submit"
          disabled={pending}
          className="mt-6 min-h-12 bg-accent px-7 text-[14px] font-extrabold text-bg disabled:opacity-60"
        >
          {pending ? "Đang lưu…" : `LƯU QUYỀN CHO ${nhanVaiTro(role, roles).toUpperCase()}`}
        </button>
      </form>
    </section>
  );
}

const o =
  "w-full border border-border-soft bg-bg px-2.5 py-2 text-[16px] outline-none focus:border-accent lg:text-[13.5px]";
