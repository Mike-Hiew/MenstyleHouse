import Link from "next/link";
import { requirePermission } from "@/server/admin/guard";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { ReceiptEditor } from "@/components/admin/receipt-editor";
import { getReceipt, RECEIPT_STATUS_LABEL } from "@/server/admin/receipts";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ code: string }> };

export default async function ReceiptDetailPage({ params }: Params) {
  await requirePermission("kho.ghi-so");
  const { code } = await params;
  const receipt = await getReceipt(decodeURIComponent(code));
  if (!receipt) notFound();

  const editable = receipt.status === "DRAFT";

  return (
    <div>
      <Link
        href="/admin/nhap-kho"
        className="mb-3.5 inline-flex min-h-11 items-center text-[12.5px] font-extrabold text-accent"
      >
        ← QUAY LẠI DANH SÁCH PHIẾU
      </Link>

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b-2 border-border-soft pb-3.5">
        <div>
          <h1 className="font-mono text-[26px] font-bold lg:text-[34px]">{receipt.code}</h1>
          <p className="mt-1.5 text-[13.5px] text-muted">
            {receipt.supplier.name} → {receipt.warehouse.name}
            {receipt.refDoc ? " · chứng từ " + receipt.refDoc : ""} · tạo{" "}
            {formatDateTime(receipt.createdAt)}
          </p>
        </div>
        <Badge tone={receipt.status === "POSTED" ? "ok" : receipt.status === "CANCELLED" ? "warn" : "neutral"}>
          {RECEIPT_STATUS_LABEL[receipt.status]}
        </Badge>
      </div>

      <ReceiptEditor
        code={receipt.code}
        editable={editable}
        lines={receipt.lines.map((l) => ({
          id: l.id,
          sku: l.sku,
          qty: l.qty,
          unitCost: l.unitCost,
          lineTotal: l.lineTotal,
        }))}
        vatRate={receipt.vatRate}
        netAmount={receipt.netAmount}
        vatAmount={receipt.vatAmount}
        grossAmount={receipt.grossAmount}
      />

      {receipt.events.length > 0 ? (
        <section className="mt-8">
          <h2 className="mb-3 border-b-2 border-border-soft pb-2.5 text-[18px] font-extrabold">
            Lịch sử thao tác
          </h2>
          <ol className="flex flex-col gap-2.5">
            {receipt.events.map((e) => (
              <li key={e.id} className="flex flex-wrap gap-x-3 text-[13px]">
                <span className="label-tech">{formatDateTime(e.createdAt)}</span>
                <span className="font-semibold">{e.what}</span>
                <span className="text-faint">{e.who}</span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </div>
  );
}
