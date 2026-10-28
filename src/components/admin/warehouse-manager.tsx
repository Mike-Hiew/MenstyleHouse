"use client";

import * as React from "react";
import { useActionState } from "react";
import { cn } from "@/lib/cn";
import {
  datKhoChinhAction,
  suaKhoAction,
  themKhoAction,
  xoaKhoAction,
} from "@/app/admin/kho/actions";
import type { AdminActionState } from "@/app/admin/actions";

export type Kho = {
  id: string;
  name: string;
  address: string;
  isMain: boolean;
  soSku: number;
  tongTon: number;
  soPhieu: number;
  soDongSo: number;
};

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
 * Danh mục kho.
 *
 * Mỗi dòng hiện **đang giữ bao nhiêu hàng và đã có bao nhiêu phiếu** ngay cạnh
 * nút xoá. Đó là thứ trả lời câu "xoá kho này có mất gì không" trước khi bấm,
 * thay vì bấm rồi mới biết là không xoá được.
 *
 * Kho chính không có nút xoá — phải chỉ định kho khác làm kho chính trước. Ẩn
 * nút ở đây chỉ là cho đỡ bấm nhầm; chốt thật nằm ở server.
 */
export function WarehouseManager({ khos }: { khos: Kho[] }) {
  const [tState, them, dangThem] = useActionState<AdminActionState, FormData>(themKhoAction, {});
  const [sState, sua] = useActionState<AdminActionState, FormData>(suaKhoAction, {});
  const [cState, datChinh] = useActionState<AdminActionState, FormData>(datKhoChinhAction, {});
  const [xState, xoa] = useActionState<AdminActionState, FormData>(xoaKhoAction, {});

  const [dangSua, setDangSua] = React.useState<string | null>(null);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px] lg:items-start">
      <div>
        <Bao
          state={
            sState.message ? sState : cState.message ? cState : xState.message ? xState : tState
          }
        />

        {khos.length === 0 ? (
          <p className="border border-dashed border-border-soft bg-subtle px-4 py-6 text-[13.5px] text-muted">
            Chưa có kho nào. Không có kho thì hàng nhập về không biết ghi vào đâu — thêm một kho ở
            khối bên phải.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr>
                  {["KHO", "ĐỊA CHỈ", "ĐANG GIỮ", "SỔ SÁCH", ""].map((h, i) => (
                    <th
                      key={h || i}
                      className={cn(
                        "label-tech whitespace-nowrap border-b-2 border-border-soft py-2 pr-3 font-bold",
                        i === 2 || i === 3 ? "text-right" : "text-left",
                      )}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {khos.map((k) => (
                  <tr key={k.id}>
                    {dangSua === k.id ? (
                      <>
                        <td className="border-b border-hairline py-2 pr-3">
                          <input
                            form={"sua-" + k.id}
                            name="name"
                            defaultValue={k.name}
                            aria-label="Tên kho"
                            className="h-9 w-[170px] border border-border-soft bg-surface px-2 text-[13px]"
                          />
                        </td>
                        <td colSpan={3} className="border-b border-hairline py-2 pr-3">
                          <input
                            form={"sua-" + k.id}
                            name="address"
                            defaultValue={k.address}
                            aria-label="Địa chỉ kho"
                            className="h-9 w-full border border-border-soft bg-surface px-2 text-[13px]"
                          />
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="border-b border-hairline py-2.5 pr-3">
                          <span className="font-semibold">{k.name}</span>
                          {k.isMain ? (
                            <span className="label-tech ml-2 border border-divider px-1.5 py-0.5">
                              KHO CHÍNH
                            </span>
                          ) : null}
                        </td>
                        <td className="border-b border-hairline py-2.5 pr-3 text-muted">
                          {k.address}
                        </td>
                        <td className="whitespace-nowrap border-b border-hairline py-2.5 pr-3 text-right font-mono">
                          {k.tongTon === 0 ? (
                            <span className="text-faint">trống</span>
                          ) : (
                            <>
                              {k.tongTon}
                              <span className="text-faint"> · {k.soSku} SKU</span>
                            </>
                          )}
                        </td>
                        <td className="whitespace-nowrap border-b border-hairline py-2.5 pr-3 text-right font-mono text-muted">
                          {k.soPhieu + k.soDongSo === 0 ? (
                            <span className="text-faint">chưa có</span>
                          ) : (
                            `${k.soPhieu} phiếu · ${k.soDongSo} dòng`
                          )}
                        </td>
                      </>
                    )}

                    <td className="whitespace-nowrap border-b border-hairline py-2 text-right">
                      {dangSua === k.id ? (
                        <span className="flex items-center justify-end gap-3">
                          <form id={"sua-" + k.id} action={sua} onSubmit={() => setDangSua(null)}>
                            <input type="hidden" name="id" value={k.id} />
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
                          {k.isMain ? null : (
                            <form action={datChinh}>
                              <input type="hidden" name="id" value={k.id} />
                              <button
                                type="submit"
                                className="flex min-h-11 items-center text-[12px] underline"
                              >
                                Đặt làm kho chính
                              </button>
                            </form>
                          )}
                          <button
                            type="button"
                            onClick={() => setDangSua(k.id)}
                            className="flex min-h-11 items-center text-[12px] underline"
                          >
                            Sửa
                          </button>
                          {k.isMain ? null : (
                            <form action={xoa}>
                              <input type="hidden" name="id" value={k.id} />
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
        )}
      </div>

      <aside>
        <form action={them} className="border-2 border-border-soft p-4">
          <p className="label-tech mb-3 font-bold">THÊM KHO</p>

          <label className="mb-3 block">
            <span className="mb-1.5 block text-[12px] font-semibold">Tên kho</span>
            <input name="name" placeholder="Kho Long Biên" className={o} />
          </label>

          <label className="mb-3 block">
            <span className="mb-1.5 block text-[12px] font-semibold">Địa chỉ</span>
            <input name="address" placeholder="45 Ngọc Lâm, Q. Long Biên, Hà Nội" className={o} />
          </label>

          <button
            type="submit"
            disabled={dangThem}
            className="flex h-11 w-full items-center justify-center bg-accent text-[13px] font-extrabold text-bg disabled:opacity-60"
          >
            {dangThem ? "Đang thêm…" : "THÊM KHO"}
          </button>

          <p className="mt-3 text-[12px] leading-[1.6] text-faint">
            Kho đầu tiên tự thành kho chính. Hàng nhập về mà không chỉ định kho sẽ vào kho chính.
          </p>
        </form>
      </aside>
    </div>
  );
}
