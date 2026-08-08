"use client";

import * as React from "react";
import Link from "next/link";
import { InvoiceA4, InvoiceThermal, type NguoiBan } from "@/components/admin/invoice-paper";
import type { InvoiceDetail } from "@/server/admin/invoices";

/**
 * Khung xem hoá đơn: chuyển khổ A4 ↔ 80mm và in.
 *
 * In bằng `@page` chứ không dựng PDF ở server. Khổ giấy phải đổi theo bản đang
 * xem, nên quy tắc `@page` được render lại theo state — CSS in tĩnh không làm
 * được việc đó.
 *
 * Lệch mockup có chủ ý: mockup có hai nút "XUẤT PDF" và "IN HOÁ ĐƠN". Ở đây chỉ
 * một nút, vì cả hai đều dẫn tới cùng hộp thoại in của trình duyệt — nơi "Lưu
 * thành PDF" là một lựa chọn đích. Hai nút trông khác nhau mà làm đúng một việc
 * thì tệ hơn là một nút nói rõ nó làm gì.
 */
export function InvoiceView({ inv, bans }: { inv: InvoiceDetail; bans: NguoiBan }) {
  const [kho, setKho] = React.useState<"a4" | "nhiet">("a4");

  return (
    <div>
      <style>{`
        @page { size: ${kho === "a4" ? "A4" : "80mm auto"}; margin: ${kho === "a4" ? "10mm" : "4mm"}; }
        @media print {
          /* Chỉ tờ hoá đơn được in; sidebar, thanh công cụ, header admin biến mất. */
          body * { visibility: hidden !important; }
          #to-hoa-don, #to-hoa-don * { visibility: visible !important; }
          #to-hoa-don { position: absolute; left: 0; top: 0; margin: 0 !important; }
        }
      `}</style>

      <div className="mb-5 flex flex-wrap items-center gap-3 print:hidden">
        <Link
          href="/admin/hoa-don"
          className="flex min-h-11 items-center text-[12.5px] font-extrabold text-accent"
        >
          ← HOÁ ĐƠN
        </Link>
        <div className="ml-auto flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={() => setKho(kho === "a4" ? "nhiet" : "a4")}
            className="min-h-11 border border-border-soft px-[18px] text-[13px] font-extrabold"
          >
            {kho === "a4" ? "Xem bản 80mm" : "Xem bản A4"}
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="min-h-11 bg-accent px-5 text-[13px] font-extrabold text-bg"
          >
            IN HOÁ ĐƠN
          </button>
        </div>
      </div>

      <p className="mb-4 text-[12.5px] text-faint print:hidden">
        Cần file PDF thì bấm <strong>In hoá đơn</strong> rồi chọn đích “Lưu thành PDF” trong hộp
        thoại in.
      </p>

      <div className="overflow-x-auto pb-6">
        {kho === "a4" ? <InvoiceA4 inv={inv} bans={bans} /> : <InvoiceThermal inv={inv} bans={bans} />}
      </div>
    </div>
  );
}
