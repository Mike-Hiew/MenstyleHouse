"use client";

import * as React from "react";
import { useActionState } from "react";
import type { MeasureKey, MeasureOf, MeasureUnit } from "@prisma/client";
import { cn } from "@/lib/cn";
import { kyHieuDonVi } from "@/lib/size-chart";
import {
  chuyenCotAction,
  ganDanhMucAction,
  suaBangAction,
  suaCotAction,
  suaDongAction,
  themCotAction,
  themDongAction,
  xoaCotAction,
  xoaDongAction,
  type BangSizeState,
} from "@/app/admin/bang-size/actions";

export type Cot = {
  id: string;
  label: string;
  key: MeasureKey | null;
  of: MeasureOf;
  unit: MeasureUnit;
};
export type Dong = { id: string; size: string; values: string[] };
export type Bang = {
  id: string;
  name: string;
  fit: string;
  howTo: string[];
  columns: Cot[];
  rows: Dong[];
};
export type DanhMuc = { id: string; name: string; sizeChartId: string | null };

const o = "h-11 w-full border border-border-soft bg-surface px-3 text-[13.5px]";
const oNho = "h-9 w-full border border-border-soft bg-surface px-2 text-[13px]";

/**
 * Khoá đo để chọn trong danh sách.
 *
 * Khai khoá là thứ biến `"88"` từ một chuỗi thành một số đo máy hiểu được. Bỏ
 * trống cũng được — cột đó thành cột chữ tự do, hiện ra vẫn bình thường, chỉ là
 * không tính toán được. Đó là đánh đổi có ý thức chứ không phải thiếu sót: cửa
 * hàng vẫn cần chỗ ghi những ghi chú không đo thành số.
 */
const KHOA_DO: { value: MeasureKey | ""; ten: string }[] = [
  { value: "", ten: "— cột chữ, không đo —" },
  { value: "CHEST", ten: "Vòng ngực" },
  { value: "WAIST", ten: "Vòng eo" },
  { value: "HIP", ten: "Vòng mông" },
  { value: "SHOULDER", ten: "Rộng vai" },
  { value: "SLEEVE", ten: "Dài tay" },
  { value: "TOP_LENGTH", ten: "Dài áo" },
  { value: "BOTTOM_LENGTH", ten: "Dài quần" },
  { value: "LEG_OPENING", ten: "Ống" },
  { value: "INSEAM", ten: "Dài dàng trong" },
  { value: "THIGH", ten: "Vòng đùi" },
  { value: "NECK", ten: "Vòng cổ" },
  { value: "HEIGHT", ten: "Chiều cao" },
  { value: "WEIGHT", ten: "Cân nặng" },
];

const DO_CAI_GI: { value: MeasureOf; ten: string }[] = [
  { value: "GARMENT", ten: "Sản phẩm" },
  { value: "BODY", ten: "Cơ thể" },
];

const DON_VI: MeasureUnit[] = ["CM", "INCH", "KG"];

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
 * Khai báo các cột của bảng.
 *
 * Tách hẳn khỏi khối "thông tin bảng" vì cột giờ là bản ghi thật, không còn là
 * một chuỗi phân tách bằng phẩy. Đổi lại được ba thứ mà bản cũ không có: đổi
 * nhãn cột mà không mất ý nghĩa, khai đơn vị riêng cho từng cột, và **xoá một
 * cột không làm lệch dòng nào** — ô neo vào cột bằng khoá ngoại.
 */
function QuanLyCot({ bang }: { bang: Bang }) {
  const [tState, themCot, dangThem] = useActionState<BangSizeState, FormData>(themCotAction, {});
  const [sState, suaCot] = useActionState<BangSizeState, FormData>(suaCotAction, {});
  const [xState, xoaCot] = useActionState<BangSizeState, FormData>(xoaCotAction, {});
  const [cState, chuyenCot] = useActionState<BangSizeState, FormData>(chuyenCotAction, {});
  const [dangSua, setDangSua] = React.useState<string | null>(null);

  return (
    <div className="border-2 border-border-soft p-4">
      <p className="label-tech mb-3 font-bold">CÁC CỘT</p>
      <Bao
        state={
          tState.message
            ? tState
            : sState.message
              ? sState
              : xState.message
                ? xState
                : cState
        }
      />
      <p className="mb-3 text-[12.5px] leading-[1.6] text-muted">
        Cột “Size” tự có, không cần khai. Khai <strong>khoá đo</strong> thì con số mới dùng được
        cho việc gợi ý size sau này; để trống là cột chữ thuần.
      </p>

      {bang.columns.length === 0 ? (
        <p className="mb-3 border border-dashed border-border-soft bg-subtle px-3.5 py-4 text-[13px] text-muted">
          Chưa có cột nào. Bảng không cột thì dòng size không chứa được gì.
        </p>
      ) : (
        <ul className="mb-4 flex flex-col border-t border-hairline">
          {bang.columns.map((c, i) => (
            <li key={c.id} className="border-b border-hairline py-2.5">
              {dangSua === c.id ? (
                <form action={suaCot} onSubmit={() => setDangSua(null)}>
                  <input type="hidden" name="chartId" value={bang.id} />
                  <input type="hidden" name="columnId" value={c.id} />
                  <input
                    name="label"
                    defaultValue={c.label}
                    aria-label="Tên cột"
                    className={cn(oNho, "mb-2")}
                  />
                  <div className="mb-2 grid grid-cols-[1fr_auto_auto] gap-2">
                    <select name="key" defaultValue={c.key ?? ""} aria-label="Khoá đo" className={oNho}>
                      {KHOA_DO.map((k) => (
                        <option key={k.value} value={k.value}>
                          {k.ten}
                        </option>
                      ))}
                    </select>
                    <select name="of" defaultValue={c.of} aria-label="Đo cái gì" className={oNho}>
                      {DO_CAI_GI.map((d) => (
                        <option key={d.value} value={d.value}>
                          {d.ten}
                        </option>
                      ))}
                    </select>
                    <select name="unit" defaultValue={c.unit} aria-label="Đơn vị" className={oNho}>
                      {DON_VI.map((u) => (
                        <option key={u} value={u}>
                          {kyHieuDonVi(u)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <span className="flex items-center gap-3">
                    <button
                      type="submit"
                      className="flex min-h-11 items-center text-[12px] font-extrabold text-accent-700 underline"
                    >
                      Lưu cột
                    </button>
                    <button
                      type="button"
                      onClick={() => setDangSua(null)}
                      className="flex min-h-11 items-center text-[12px] text-faint underline"
                    >
                      Thôi
                    </button>
                  </span>
                </form>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-semibold">
                      {c.label}{" "}
                      <span className="font-normal text-faint">({kyHieuDonVi(c.unit)})</span>
                    </span>
                    <span className="block text-[11.5px] text-muted">
                      {c.key ? (
                        <>
                          {KHOA_DO.find((k) => k.value === c.key)?.ten ?? c.key} ·{" "}
                          {c.of === "BODY" ? "đo cơ thể" : "đo sản phẩm"}
                        </>
                      ) : (
                        <span className="text-faint">cột chữ — không tính toán được</span>
                      )}
                    </span>
                  </span>

                  <form action={chuyenCot}>
                    <input type="hidden" name="chartId" value={bang.id} />
                    <input type="hidden" name="columnId" value={c.id} />
                    <input type="hidden" name="huong" value="len" />
                    <button
                      type="submit"
                      disabled={i === 0}
                      aria-label={"Đưa cột " + c.label + " lên trước"}
                      className="flex h-9 w-7 items-center justify-center text-[13px] disabled:opacity-25"
                    >
                      ↑
                    </button>
                  </form>
                  <form action={chuyenCot}>
                    <input type="hidden" name="chartId" value={bang.id} />
                    <input type="hidden" name="columnId" value={c.id} />
                    <input type="hidden" name="huong" value="xuong" />
                    <button
                      type="submit"
                      disabled={i === bang.columns.length - 1}
                      aria-label={"Đưa cột " + c.label + " xuống sau"}
                      className="flex h-9 w-7 items-center justify-center text-[13px] disabled:opacity-25"
                    >
                      ↓
                    </button>
                  </form>
                  <button
                    type="button"
                    onClick={() => setDangSua(c.id)}
                    className="flex min-h-11 items-center text-[12px] underline"
                  >
                    Sửa
                  </button>
                  <form action={xoaCot}>
                    <input type="hidden" name="chartId" value={bang.id} />
                    <input type="hidden" name="columnId" value={c.id} />
                    <button
                      type="submit"
                      className="flex min-h-11 items-center text-[12px] text-faint underline"
                    >
                      Xoá
                    </button>
                  </form>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <form action={themCot} className="border-t-2 border-border-soft pt-3.5">
        <input type="hidden" name="chartId" value={bang.id} />
        <input name="label" placeholder="Tên cột mới, ví dụ Vòng ngực" className={cn(oNho, "mb-2")} />
        <div className="mb-2 grid grid-cols-[1fr_auto_auto] gap-2">
          <select name="key" defaultValue="" aria-label="Khoá đo" className={oNho}>
            {KHOA_DO.map((k) => (
              <option key={k.value} value={k.value}>
                {k.ten}
              </option>
            ))}
          </select>
          <select name="of" defaultValue="GARMENT" aria-label="Đo cái gì" className={oNho}>
            {DO_CAI_GI.map((d) => (
              <option key={d.value} value={d.value}>
                {d.ten}
              </option>
            ))}
          </select>
          <select name="unit" defaultValue="CM" aria-label="Đơn vị" className={oNho}>
            {DON_VI.map((u) => (
              <option key={u} value={u}>
                {kyHieuDonVi(u)}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={dangThem}
          className="flex h-11 w-full items-center justify-center bg-neutral-900 text-[13px] font-extrabold text-bg disabled:opacity-60"
        >
          {dangThem ? "Đang thêm…" : "THÊM CỘT"}
        </button>
      </form>
    </div>
  );
}

/**
 * Sửa một bảng size: phần đầu (tên, ghi chú), các cột và các dòng size.
 *
 * Cột **"Size" không nằm trong danh sách cột sửa được** — nó luôn đứng đầu và là
 * khoá của mỗi dòng. Cho sửa thì bảng mất chỗ neo, và dòng "M" không còn biết
 * mình là size gì.
 *
 * Bản trước phải cảnh báo "lệch cột" ở từng dòng, vì cột và giá trị là hai mảng
 * song song không gì buộc cùng độ dài. Giờ không cần nữa: ô neo vào cột bằng
 * khoá ngoại nên số ô luôn bằng số cột, thiếu thì hiện ô trống chứ không đẩy các
 * con số phía sau trượt đi.
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
                  <th className="label-tech whitespace-nowrap border-b-2 border-border-soft py-2 pr-3 text-left font-bold">
                    SIZE
                  </th>
                  {bang.columns.map((c) => (
                    <th
                      key={c.id}
                      className="label-tech whitespace-nowrap border-b-2 border-border-soft py-2 pr-3 text-left font-bold"
                    >
                      {c.label.toUpperCase()}
                      <span className="font-normal text-faint"> ({kyHieuDonVi(c.unit)})</span>
                    </th>
                  ))}
                  <th className="border-b-2 border-border-soft py-2" />
                </tr>
              </thead>
              <tbody>
                {bang.rows.map((r) => {
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
                {bang.columns.map((c) => c.label).join(" · ") || "Chưa khai cột nào"}
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
            Phân tách bằng dấu phẩy, xếp đúng thứ tự cột ở trên. Gõ được một giá trị
            (<code>100</code>) hoặc một khoảng (<code>88-92</code>).
          </p>
        </form>
      </div>

      <aside className="flex flex-col gap-6">
        <QuanLyCot bang={bang} />

        <form action={luuBang} className="border-2 border-border-soft p-4">
          <input type="hidden" name="id" value={bang.id} />
          <p className="label-tech mb-3 font-bold">THÔNG TIN BẢNG</p>
          <Bao state={sState} />

          <label className="mb-3 block">
            <span className="mb-1.5 block text-[12px] font-semibold">Tên bảng</span>
            <input name="name" defaultValue={bang.name} className={o} />
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
