"use client";

import { useActionState } from "react";
import { cn } from "@/lib/cn";
import { formatVnd } from "@/lib/money";
import {
  addLineAction,
  postReceiptAction,
  removeLineAction,
  cancelReceiptAction,
  type StockState,
} from "@/app/admin/nhap-kho/actions";

export type ReceiptLine = {
  id: string;
  sku: string;
  qty: number;
  unitCost: number;
  lineTotal: number;
};

/**
 * Sửa dòng hàng và ghi sổ. Khi phiếu đã `POSTED` thì toàn bộ khối nhập biến
 * mất — nhưng chốt chặn thật nằm ở server, đây chỉ là để đỡ bấm nhầm.
 */
export function ReceiptEditor({
  code,
  editable,
  lines,
  vatRate,
  netAmount,
  vatAmount,
  grossAmount,
}: {
  code: string;
  editable: boolean;
  lines: ReceiptLine[];
  vatRate: number;
  netAmount: number;
  vatAmount: number;
  grossAmount: number;
}) {
  const [addState, addAction, adding] = useActionState<StockState, FormData>(addLineAction, {});
  const [rowState, removeAction] = useActionState<StockState, FormData>(removeLineAction, {});
  const [postState, postAction, posting] = useActionState<StockState, FormData>(
    postReceiptAction,
    {},
  );
  const [cancelState, cancelAction, cancelling] = useActionState<StockState, FormData>(
    cancelReceiptAction,
    {},
  );

  const notice = postState.message ?? cancelState.message ?? rowState.message;
  const noticeOk = postState.message ? postState.ok : cancelState.message ? cancelState.ok : rowState.ok;

  return (
    <div className="grid items-start gap-7 xl:grid-cols-[1fr_320px]">
      <div>
        {notice ? (
          <p
            role="alert"
            className={cn(
              "mb-4 border-2 px-4 py-3 text-[13.5px] font-semibold",
              noticeOk ? "border-divider bg-subtle" : "border-accent bg-accent-100 text-accent-800",
            )}
          >
            {notice}
          </p>
        ) : null}

        <h2 className="mb-3 border-b-2 border-border-soft pb-2.5 text-[18px] font-extrabold">
          Dòng hàng
        </h2>

        {lines.length === 0 ? (
          <p className="border border-dashed border-border-soft bg-subtle px-5 py-8 text-[14px] text-muted">
            Chưa có dòng nào. Thêm SKU bên dưới rồi mới ghi sổ được.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13.5px]">
              <thead>
                <tr>
                  {["SKU", "SỐ LƯỢNG", "GIÁ VỐN", "THÀNH TIỀN", ""].map((h, i) => (
                    <th
                      key={h || "act"}
                      className={cn(
                        "label-tech border-b-2 border-border-soft py-2.5 pr-3 font-bold",
                        i === 0 ? "text-left" : "text-right",
                      )}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lines.map((l) => (
                  <tr key={l.id}>
                    <td className="border-b border-hairline py-3 pr-3 font-mono font-bold">
                      {l.sku}
                    </td>
                    <td className="border-b border-hairline py-3 pr-3 text-right font-mono">
                      {l.qty}
                    </td>
                    <td className="border-b border-hairline py-3 pr-3 text-right font-mono">
                      {formatVnd(l.unitCost)}
                    </td>
                    <td className="border-b border-hairline py-3 pr-3 text-right font-extrabold">
                      {formatVnd(l.lineTotal)}
                    </td>
                    <td className="border-b border-hairline py-3 text-right">
                      {editable ? (
                        <form action={removeAction}>
                          <input type="hidden" name="code" value={code} />
                          <input type="hidden" name="lineId" value={l.id} />
                          <button
                            type="submit"
                            className="min-h-11 text-[12.5px] text-faint underline"
                          >
                            Xoá
                          </button>
                        </form>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {editable ? (
          <form action={addAction} className="mt-5 border-2 border-border-soft p-4">
            <p className="label-tech mb-3 font-bold">THÊM DÒNG HÀNG</p>
            {addState.message ? (
              <p
                role="alert"
                className={cn(
                  "mb-3 text-[12.5px] font-semibold",
                  addState.ok ? "text-muted" : "text-accent-700",
                )}
              >
                {addState.message}
              </p>
            ) : null}
            <input type="hidden" name="code" value={code} />
            <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr_auto]">
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-semibold">SKU</span>
                <input name="sku" placeholder="MSH-101-DEN-M" required className={input} />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-semibold">Số lượng</span>
                <input name="qty" inputMode="numeric" defaultValue={1} required className={input} />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-semibold">Giá vốn (₫)</span>
                <input name="unitCost" inputMode="numeric" defaultValue={0} className={input} />
              </label>
              <button
                type="submit"
                disabled={adding}
                className="min-h-12 self-end bg-neutral-900 px-5 text-[13.5px] font-extrabold text-bg disabled:opacity-60"
              >
                {adding ? "…" : "Thêm"}
              </button>
            </div>
          </form>
        ) : null}
      </div>

      <aside className="border-2 border-border-soft p-5">
        <h2 className="mb-4 text-[16px] font-extrabold">Tổng phiếu</h2>
        <dl className="flex flex-col gap-2 text-[14px]">
          <Row label="Tiền hàng" value={formatVnd(netAmount)} />
          <Row label={`VAT ${vatRate}%`} value={formatVnd(vatAmount)} />
        </dl>
        <div className="mt-3 flex items-baseline justify-between border-t-2 border-border-soft pt-3">
          <span className="text-[14px] font-extrabold">TỔNG CỘNG</span>
          <span className="text-[20px] font-extrabold">{formatVnd(grossAmount)}</span>
        </div>

        {editable ? (
          <>
            <form action={postAction} className="mt-5">
              <input type="hidden" name="code" value={code} />
              <button
                type="submit"
                disabled={posting || lines.length === 0}
                className="min-h-12 w-full bg-accent text-[14px] font-extrabold text-bg disabled:opacity-40"
              >
                {posting ? "Đang ghi sổ…" : "GHI SỔ PHIẾU"}
              </button>
            </form>
            <p className="mt-2.5 text-[12.5px] leading-[1.6] text-faint">
              Ghi sổ là <strong>một chiều</strong>. Sau khi ghi, phiếu không sửa và không ghi lại
              được. Sai số liệu thì lập phiếu điều chỉnh tồn.
            </p>

            <form action={cancelAction} className="mt-4 border-t border-hairline pt-4">
              <input type="hidden" name="code" value={code} />
              <button
                type="submit"
                disabled={cancelling}
                className="min-h-11 w-full border border-border-soft text-[13px] font-extrabold disabled:opacity-60"
              >
                Huỷ phiếu nháp
              </button>
            </form>
          </>
        ) : (
          <p className="mt-5 border border-dashed border-border-soft bg-subtle px-3.5 py-3 text-[12.5px] leading-[1.6] text-muted">
            Phiếu đã chốt nên không sửa được. Cần đổi số liệu thì lập phiếu điều chỉnh tồn ở màn
            Tồn kho.
          </p>
        )}
      </aside>
    </div>
  );
}

const input =
  "w-full border border-border-soft bg-bg px-3 py-2.5 text-[16px] outline-none focus:border-accent lg:text-[14px]";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}
