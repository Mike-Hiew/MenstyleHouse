"use client";

import * as React from "react";
import { useActionState } from "react";
import { cn } from "@/lib/cn";
import {
  ganDanhMucAction,
  suaBangAction,
  suaDongAction,
  themDongAction,
  xoaDongAction,
  type BangSizeState,
} from "@/app/admin/bang-size/actions";

export type Dong = { id: string; size: string; values: string[] };
export type Bang = {
  id: string;
  name: string;
  fit: string;
  howTo: string[];
  columns: string[];
  rows: Dong[];
};
export type DanhMuc = { id: string; name: string; sizeChartId: string | null };

const o = "h-11 w-full border border-border-soft bg-surface px-3 text-[13.5px]";

function Bao({ state }: { state: BangSizeState }) {
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
 * Sửa một bảng size: phần đầu (tên, cột, ghi chú) và các dòng size.
 *
 * Cột **"Size" không nằm trong danh sách cột sửa được** — nó luôn đứng đầu và là
 * khoá của mỗi dòng. Cho sửa thì bảng mất chỗ neo, và dòng "M" không còn biết
 * mình là size gì.
 *
 * Số ô giá trị của mỗi dòng phải khớp số cột. Lệch thì **cảnh báo ngay tại
 * dòng** chứ không chặn lưu: người ta hay thêm cột trước rồi mới đi điền lại
 * từng dòng, chặn giữa chừng là bắt họ làm ngược.
 */
export function SizeChartManager({ bang, danhMuc }: { bang: Bang; danhMuc: DanhMuc[] }) {
  const [sState, luuBang, dangLuu] = useActionState<BangSizeState, FormData>(suaBangAction, {});
  const [tState, themDong, dangThem] = useActionState<BangSizeState, FormData>(themDongAction, {});
  const [dState, suaDong] = useActionState<BangSizeState, FormData>(suaDongAction, {});
  const [xState, xoaDong] = useActionState<BangSizeState, FormData>(xoaDongAction, {});
  const [gState, ganDanhMuc] = useActionState<BangSizeState, FormData>(ganDanhMucAction, {});

  const [dangSua, setDangSua] = React.useState<string | null>(null);
  const soCot = bang.columns.length;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px] lg:items-start">
      <div>
        <h2 className="mb-3 border-b-2 border-border-soft pb-2.5 text-[16px] font-extrabold">
          Các dòng size
        </h2>
        <Bao state={tState.message ? tState : dState.message ? dState : xState} />

        {bang.rows.length === 0 ? (
          <p className="mb-4 border border-dashed border-border-soft bg-subtle px-4 py-6 text-[13.5px] text-muted">
            Bảng chưa có dòng nào. Bảng không có dòng thì trang sản phẩm không hiện gì cả — thêm
            ít nhất một size bên dưới.
          </p>
        ) : (
          <div className="mb-4 overflow-x-auto">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr>
                  {["SIZE", ...bang.columns.map((c) => c.toUpperCase()), ""].map((h, i) => (
                    <th
                      key={h || i}
                      className="label-tech whitespace-nowrap border-b-2 border-border-soft py-2 pr-3 text-left font-bold"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bang.rows.map((r) => {
                  const lech = r.values.length !== soCot;
                  return (
                    <tr key={r.id}>
                      {dangSua === r.id ? (
                        <>
                          <td className="border-b border-hairline py-2 pr-3">
                            <input
                              form={"sua-" + r.id}
                              name="size"
                              defaultValue={r.size}
                              aria-label="Nhãn size"
                              className="h-9 w-[70px] border border-border-soft bg-surface px-2 text-[13px]"
                            />
                          </td>
                          <td
                            colSpan={soCot}
                            className="border-b border-hairline py-2 pr-3"
                          >
                            <input
                              form={"sua-" + r.id}
                              name="values"
                              defaultValue={r.values.join(", ")}
                              aria-label="Giá trị các cột, phân tách bằng dấu phẩy"
                              className="h-9 w-full border border-border-soft bg-surface px-2 text-[13px]"
                            />
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="border-b border-hairline py-2 pr-3 font-bold">{r.size}</td>
                          {Array.from({ length: soCot }, (_, i) => (
                            <td key={i} className="border-b border-hairline py-2 pr-3 font-mono">
                              {r.values[i] ?? (
                                <span className="text-accent-700" title="Thiếu giá trị cho cột này">
                                  —
                                </span>
                              )}
                            </td>
                          ))}
                        </>
                      )}

                      <td className="whitespace-nowrap border-b border-hairline py-2 text-right">
                        {dangSua === r.id ? (
                          <span className="flex items-center justify-end gap-3">
                            <form
                              id={"sua-" + r.id}
                              action={suaDong}
                              onSubmit={() => setDangSua(null)}
                            >
                              <input type="hidden" name="rowId" value={r.id} />
                              <input type="hidden" name="chartId" value={bang.id} />
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
                            {lech ? (
                              <span
                                className="text-[11.5px] font-semibold text-accent-700"
                                title={`Dòng này có ${r.values.length} giá trị nhưng bảng có ${soCot} cột`}
                              >
                                lệch cột
                              </span>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => setDangSua(r.id)}
                              className="flex min-h-11 items-center text-[12px] underline"
                            >
                              Sửa
                            </button>
                            <form action={xoaDong}>
                              <input type="hidden" name="rowId" value={r.id} />
                              <input type="hidden" name="chartId" value={bang.id} />
                              <button
                                type="submit"
                                className="flex min-h-11 items-center text-[12px] text-faint underline"
                              >
                                Xoá
                              </button>
                            </form>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <form action={themDong} className="border-2 border-border-soft p-4">
          <input type="hidden" name="chartId" value={bang.id} />
          <p className="label-tech mb-3 font-bold">THÊM DÒNG</p>
          <div className="grid gap-3 sm:grid-cols-[110px_1fr_auto]">
            <label className="block">
              <span className="mb-1.5 block text-[12px] font-semibold">Size</span>
              <input name="size" placeholder="M" className={o} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[12px] font-semibold">
                {bang.columns.join(" · ") || "Chưa khai cột nào"}
              </span>
              <input
                name="values"
                placeholder={bang.columns.map(() => "…").join(", ")}
                className={o}
              />
            </label>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={dangThem}
                className="flex h-11 items-center bg-accent px-5 text-[13px] font-extrabold text-bg disabled:opacity-60"
              >
                THÊM
              </button>
            </div>
          </div>
          <p className="mt-2.5 text-[12px] text-faint">
            Giá trị phân tách bằng dấu phẩy, xếp đúng thứ tự cột ở trên.
          </p>
        </form>
      </div>

      <aside className="flex flex-col gap-6">
        <form action={luuBang} className="border-2 border-border-soft p-4">
          <input type="hidden" name="id" value={bang.id} />
          <p className="label-tech mb-3 font-bold">THÔNG TIN BẢNG</p>
          <Bao state={sState} />

          <label className="mb-3 block">
            <span className="mb-1.5 block text-[12px] font-semibold">Tên bảng</span>
            <input name="name" defaultValue={bang.name} className={o} />
          </label>

          <label className="mb-3 block">
            <span className="mb-1.5 block text-[12px] font-semibold">Các cột</span>
            <input name="columns" defaultValue={bang.columns.join(", ")} className={o} />
            <span className="mt-1.5 block text-[12px] text-faint">
              Phân tách bằng dấu phẩy. Cột “Size” tự có, không cần khai.
            </span>
          </label>

          <label className="mb-3 block">
            <span className="mb-1.5 block text-[12px] font-semibold">Ghi chú về form</span>
            <input name="fit" defaultValue={bang.fit} className={o} />
          </label>

          <label className="mb-3 block">
            <span className="mb-1.5 block text-[12px] font-semibold">Hướng dẫn đo</span>
            <textarea
              name="howTo"
              rows={4}
              defaultValue={bang.howTo.join("\n")}
              className="w-full border border-border-soft bg-surface px-3 py-2.5 text-[13.5px]"
            />
            <span className="mt-1.5 block text-[12px] text-faint">Mỗi dòng một hướng dẫn.</span>
          </label>

          <button
            type="submit"
            disabled={dangLuu}
            className="flex h-11 w-full items-center justify-center bg-accent text-[13px] font-extrabold text-bg disabled:opacity-60"
          >
            {dangLuu ? "Đang lưu…" : "LƯU BẢNG"}
          </button>
        </form>

        <div className="border-2 border-border-soft p-4">
          <p className="label-tech mb-3 font-bold">DANH MỤC DÙNG BẢNG NÀY</p>
          <Bao state={gState} />
          <p className="mb-3 text-[12.5px] leading-[1.6] text-muted">
            Tick để gán. Bỏ tick là danh mục đó không còn bảng size nào — đúng cho phụ kiện chỉ
            có Freesize.
          </p>
          <ul className="flex flex-col">
            {danhMuc.map((d) => {
              const dangDung = d.sizeChartId === bang.id;
              return (
                <li key={d.id} className="border-b border-hairline last:border-b-0">
                  <form action={ganDanhMuc}>
                    <input type="hidden" name="categoryId" value={d.id} />
                    <input type="hidden" name="chartId" value={dangDung ? "" : bang.id} />
                    <button
                      type="submit"
                      className="flex min-h-11 w-full items-center gap-2.5 text-left text-[13.5px]"
                    >
                      <span
                        aria-hidden
                        className={cn(
                          "grid h-[18px] w-[18px] flex-none place-items-center border-2 text-[11px] font-bold",
                          dangDung ? "border-accent bg-accent text-bg" : "border-border-soft",
                        )}
                      >
                        {dangDung ? "✓" : ""}
                      </span>
                      <span className="flex-1">{d.name}</span>
                      {d.sizeChartId && !dangDung ? (
                        <span className="text-[11.5px] text-faint">đang dùng bảng khác</span>
                      ) : null}
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        </div>
      </aside>
    </div>
  );
}
