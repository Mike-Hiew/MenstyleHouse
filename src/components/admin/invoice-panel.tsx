"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { issueInvoiceAction, type AdminActionState } from "@/app/admin/actions";

/**
 * Khối hoá đơn ở chi tiết đơn.
 *
 * Đơn đã có hoá đơn thì chỉ còn đường dẫn tới bản in — không có nút phát hành
 * lại, vì mỗi đơn chỉ một hoá đơn và số đã cấp thì không đổi. Kể cả có gọi
 * thẳng action thì server cũng trả về đúng hoá đơn cũ.
 */
export function InvoicePanel({
  code,
  invoice,
  vatRequested,
}: {
  code: string;
  invoice: { symbol: string; number: string } | null;
  vatRequested: boolean;
}) {
  const [state, issue, pending] = useActionState<AdminActionState, FormData>(
    issueInvoiceAction,
    {},
  );

  return (
    <div className="border-2 border-border-soft p-5">
      <p className="label-tech mb-2 font-bold">HOÁ ĐƠN GTGT</p>

      {invoice ? (
        <>
          <p className="font-mono text-[15px] font-bold">{invoice.number}</p>
          <p className="mt-0.5 text-[12.5px] text-muted">Ký hiệu {invoice.symbol}</p>
          <Link
            href={("/admin/hoa-don/" + invoice.symbol + "-" + invoice.number) as Route}
            className="mt-3 flex min-h-11 items-center justify-center border border-border-soft text-[13px] font-extrabold"
          >
            Xem và in
          </Link>
        </>
      ) : (
        <>
          <p className="text-[13px] leading-[1.6] text-muted">
            {vatRequested
              ? "Khách có yêu cầu xuất hoá đơn công ty khi đặt."
              : "Khách không yêu cầu; phát hành thì xuất cho cá nhân người nhận."}
          </p>
          {state.message ? (
            <p role="alert" className="mt-3 text-[13px] font-semibold text-accent-800">
              {state.message}
            </p>
          ) : null}
          <form action={issue} className="mt-3">
            <input type="hidden" name="code" value={code} />
            <button
              type="submit"
              disabled={pending}
              className="min-h-12 w-full border border-border-soft text-[13px] font-extrabold disabled:opacity-60"
            >
              {pending ? "Đang phát hành…" : "Tạo hoá đơn"}
            </button>
          </form>
          <p className="mt-2 text-[12px] leading-[1.6] text-faint">
            Số hoá đơn cấp xong là cố định, không sửa và không xoá được.
          </p>
        </>
      )}
    </div>
  );
}
