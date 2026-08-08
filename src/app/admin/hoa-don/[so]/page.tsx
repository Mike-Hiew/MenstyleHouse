import { notFound } from "next/navigation";
import { InvoiceView } from "@/components/admin/invoice-view";
import { requirePermission } from "@/server/admin/guard";
import { getInvoice } from "@/server/admin/invoices";
import { getSettings } from "@/server/settings";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ so: string }> };

/**
 * `so` là `<ký hiệu>-<số>`, ví dụ `1C26TMS-00000007`. Ký hiệu mang năm phát
 * hành nên hai hoá đơn khác năm có thể trùng số — URL phải có cả hai phần.
 */
export default async function InvoiceDetailPage({ params }: Params) {
  await requirePermission("hoa-don.xem");

  const { so } = await params;
  const dau = decodeURIComponent(so).lastIndexOf("-");
  if (dau <= 0) notFound();

  const symbol = decodeURIComponent(so).slice(0, dau);
  const number = decodeURIComponent(so).slice(dau + 1);

  const [inv, s] = await Promise.all([getInvoice(symbol, number), getSettings()]);
  if (!inv) notFound();

  return (
    <InvoiceView
      inv={inv}
      bans={{
        shopName: s.shopName,
        address: s.address,
        taxCode: s.taxCode,
        hotline: s.hotline,
        bankName: s.bankName,
        bankAccount: s.bankAccount,
      }}
    />
  );
}
