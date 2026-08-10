"use client";

import * as React from "react";
import { useActionState } from "react";
import { cn } from "@/lib/cn";
import { khoaTuTen, type VaiTro } from "@/lib/roles";
import {
  suaVaiTroAction,
  themVaiTroAction,
  xoaVaiTroAction,
} from "@/app/admin/nhan-su/actions";
import type { AdminActionState } from "@/app/admin/actions";

export type VaiTroDong = VaiTro & { soNguoi: number; soLoiMoi: number };

const o = "h-11 w-full border border-border-soft bg-surface px-3 text-[13.5px]";

function Bao({ state }: { state: AdminActionState }) {
  if (!state.message) return null;
  return (
    <p
      role={state.ok ? "status" : "alert"}
      className={cn(
        "mb-4 border-2 px-3.5 py-2.5 text-[13px] font-semibold",
        state.ok ? "border-divider bg-subtle" : "border-accent bg-accent-100 text-accent-800",
      )}
    >
      {state.message}
    </p>
  );
}

/**
 * Danh sách vai trò.
 *
 * Ba thứ cố ý **không** cho sửa, mỗi thứ vì một lý do:
 *
 * - **Khoá** đặt một lần rồi thôi. Nó nằm trong phiên đăng nhập đang mở và trong
 *   bảng phân quyền; đổi khoá là những chỗ đó trỏ vào một vai trò không còn tồn
 *   tại. Nhãn thì đổi thoải mái — nhãn mới là thứ duy nhất người ta nhìn thấy.
 * - **Vai trò gốc** không xoá được, chỉ đổi tên.
 * - **Chủ cửa hàng** không gỡ được cờ nhân viên: chủ mà không vào được khu quản
 *   trị thì không còn ai sửa được gì nữa.
 */
export function VaiTroPanel({ roles }: { roles: VaiTroDong[] }) {
  const [tState, them, dangThem] = useActionState<AdminActionState, FormData>(themVaiTroAction, {});
  const [sState, sua] = useActionState<AdminActionState, FormData>(suaVaiTroAction, {});
  const [xState, xoa] = useActionState<AdminActionState, FormData>(xoaVaiTroAction, {});

  const [dangSua, setDangSua] = React.useState<string | null>(null);
  const [ten, setTen] = React.useState("");

  return (
    <section className="border-t-2 border-divider pt-3.5">
      <h2 className="mb-1 text-[19px]">Vai trò</h2>
      <p className="mb-4 text-[13px] leading-[1.7] text-muted">
        Thêm vai trò riêng cho cửa hàng, ví dụ <em>Trưởng ca</em> hay{" "}
        <em>Nhân viên kho phụ</em>. Tạo xong thì tick quyền cho nó ở khối{" "}
        <strong>Vai trò làm được gì</strong> bên dưới — vai trò mới chưa có quyền nào.
      </p>

      <Bao state={sState.message ? sState : xState.message ? xState : tState} />

      <div className="mb-5 overflow-x-auto">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr>
              {["VAI TRÒ", "KHOÁ", "VÀO QUẢN TRỊ", "ĐANG GẮN", ""].map((h, i) => (
                <th
                  key={h || i}
                  className={cn(
                    "label-tech whitespace-nowrap border-b-2 border-border-soft py-2 pr-3 font-bold",
                    i === 3 ? "text-right" : "text-left",
                  )}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {roles.map((r) => (
              <tr key={r.key}>
                {dangSua === r.key ? (
                  <>
                    <td className="border-b border-hairline py-2 pr-3">
                      <input
                        form={"sua-" + r.key}
                        name="label"
                        defaultValue={r.label}
                        aria-label="Tên vai trò"
                        className="h-9 w-[180px] border border-border-soft bg-surface px-2 text-[13px]"
                      />
                    </td>
                    <td className="border-b border-hairline py-2 pr-3 font-mono text-faint">
                      {r.key}
                    </td>
                    <td className="border-b border-hairline py-2 pr-3">
                      <label className="flex items-center gap-2 text-[12.5px]">
                        <input
                          form={"sua-" + r.key}
                          type="checkbox"
                          name="isStaff"
                          defaultChecked={r.isStaff}
                          disabled={r.isSuper}
                          className="h-4 w-4 accent-accent"
                        />
                        {r.isSuper ? "luôn có" : "cho vào"}
                      </label>
                    </td>
                    <td />
                  </>
                ) : (
                  <>
                    <td className="border-b border-hairline py-2.5 pr-3">
                      <span className="font-semibold">{r.label}</span>
                      {r.isSuper ? (
                        <span className="label-tech ml-2 border border-divider px-1.5 py-0.5">
                          MỌI QUYỀN
                        </span>
                      ) : null}
                      {r.builtIn && !r.isSuper ? (
                        <span className="label-tech ml-2 text-faint">gốc</span>
                      ) : null}
                    </td>
                    <td className="border-b border-hairline py-2.5 pr-3 font-mono text-muted">
                      {r.key}
                    </td>
                    <td className="border-b border-hairline py-2.5 pr-3">
                      {r.isStaff ? "Có" : <span className="text-faint">Không</span>}
                    </td>
                    <td className="whitespace-nowrap border-b border-hairline py-2.5 pr-3 text-right font-mono">
                      {r.soNguoi === 0 && r.soLoiMoi === 0 ? (
                        <span className="text-faint">chưa ai</span>
                      ) : (
                        <>
                          {r.soNguoi} người
                          {r.soLoiMoi > 0 ? ` · ${r.soLoiMoi} lời mời` : ""}
                        </>
                      )}
                    </td>
                  </>
                )}

                <td className="whitespace-nowrap border-b border-hairline py-2 text-right">
                  {dangSua === r.key ? (
                    <span className="flex items-center justify-end gap-3">
                      <form id={"sua-" + r.key} action={sua} onSubmit={() => setDangSua(null)}>
                        <input type="hidden" name="key" value={r.key} />
                        <button
                          type="submit"
                          className="flex min-h-11 items-center text-[12px] font-extrabold text-accent-700 underline"
                        >
                          Lưu
                        </button>
                      </form>
                      <button
                        type="button"
                        onClick={() => setDangSua(null)}
                        className="flex min-h-11 items-center text-[12px] text-faint underline"
                      >
                        Thôi
                      </button>
                    </span>
                  ) : (
                    <span className="flex items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setDangSua(r.key)}
                        className="flex min-h-11 items-center text-[12px] underline"
                      >
                        Đổi tên
                      </button>
                      {r.builtIn ? null : (
                        <form action={xoa}>
                          <input type="hidden" name="key" value={r.key} />
                          <button
                            type="submit"
                            className="flex min-h-11 items-center text-[12px] text-faint underline"
                          >
                            Xoá
                          </button>
                        </form>
                      )}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form action={them} className="flex flex-wrap items-end gap-3 border-t border-hairline pt-4">
        <label className="block flex-1 sm:max-w-[240px]">
          <span className="mb-1.5 block text-[12px] font-semibold">Tên vai trò mới</span>
          <input
            name="label"
            value={ten}
            onChange={(e) => setTen(e.target.value)}
            placeholder="Trưởng ca"
            className={o}
          />
        </label>

        <label className="block sm:max-w-[200px]">
          <span className="mb-1.5 block text-[12px] font-semibold">Khoá</span>
          {/*
            Khoá sinh sẵn từ tên nhưng vẫn cho sửa: nó là mã định danh, và người
            khai có thể muốn một khoá ngắn hơn cái máy đoán ra.
          */}
          <input
            name="key"
            value={khoaTuTen(ten)}
            readOnly
            aria-label="Khoá vai trò, sinh từ tên"
            className={cn(o, "font-mono text-faint")}
          />
        </label>

        <label className="flex min-h-11 items-center gap-2 text-[13px] font-semibold">
          <input
            type="checkbox"
            name="isStaff"
            defaultChecked
            className="h-[18px] w-[18px] accent-accent"
          />
          Vào được khu quản trị
        </label>

        <button
          type="submit"
          disabled={dangThem || ten.trim().length < 2}
          className="flex h-11 items-center bg-accent px-6 text-[13px] font-extrabold text-bg disabled:opacity-60"
        >
          {dangThem ? "Đang tạo…" : "THÊM VAI TRÒ"}
        </button>
      </form>
    </section>
  );
}
