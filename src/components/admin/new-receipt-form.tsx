"use client";

import * as React from "react";
import { useActionState } from "react";
import { cn } from "@/lib/cn";
import { createDraftAction, type StockState } from "@/app/admin/nhap-kho/actions";

/**
 * Tạo phiếu nháp. Mở ra dạng khối gập để danh sách phiếu không bị đẩy xuống
 * khi thủ kho chỉ muốn tra cứu.
 */
export function NewReceiptForm({
  warehouses,
  suppliers,
}: {
  warehouses: { id: string; name: string }[];
  suppliers: { id: string; name: string }[];
}) {
  const [open, setOpen] = React.useState(false);
  const [state, action, pending] = useActionState<StockState, FormData>(createDraftAction, {});

  return (
    <div className="mb-6">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="min-h-11 bg-accent px-5 text-[13.5px] font-extrabold text-bg"
      >
        {open ? "Đóng" : "+ TẠO PHIẾU NHẬP"}
      </button>

      {open ? (
        <form action={action} className="mt-4 border-2 border-border-soft p-5">
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

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Field label="Kho nhận">
              <select name="warehouseId" className={input} required>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Nhà cung cấp">
              <select name="supplierId" className={input} required>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Chứng từ gốc" hint="Số hoá đơn của nhà cung cấp">
              <input name="refDoc" placeholder="HD-2026-0142" className={input} />
            </Field>

            <Field label="Thuế suất VAT (%)">
              <input name="vatRate" inputMode="numeric" defaultValue={8} className={input} />
            </Field>
          </div>

          <button
            type="submit"
            disabled={pending}
            className="mt-4 min-h-12 bg-neutral-900 px-6 text-[13.5px] font-extrabold text-bg disabled:opacity-60"
          >
            {pending ? "Đang tạo…" : "TẠO PHIẾU NHÁP"}
          </button>
          <p className="mt-2 text-[12.5px] text-faint">
            Phiếu nháp chưa ảnh hưởng tồn kho. Tồn chỉ đổi khi bấm ghi sổ.
          </p>
        </form>
      ) : null}
    </div>
  );
}

const input =
  "w-full border border-border-soft bg-bg px-3.5 py-3 text-[16px] outline-none focus:border-accent lg:text-[14px]";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-semibold">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-[12px] text-faint">{hint}</span> : null}
    </label>
  );
}
