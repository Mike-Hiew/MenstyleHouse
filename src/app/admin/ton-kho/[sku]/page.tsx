import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requirePermission } from "@/server/admin/guard";
import { listMovements, tonTheoKho } from "@/server/admin/inventory";
import { TransferForm } from "@/components/admin/transfer-form";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Sổ kho theo biến thể" };

/**
 * Sổ kho của một biến thể.
 *
 * Bất biến `stock === Σ(movements.delta)` là nền của cả module kho, nhưng trước
 * M6.16 **không màn nào hiện sổ** — thủ kho thấy tồn còn 3 mà không có cách nào
 * biết vì sao thành 3, và khi lệch với đếm tay thì không có gì để đối chiếu.
 *
 * Cột "còn lại" cộng dồn **từ dưới lên**, đúng cách đọc một cuốn sổ: dòng cuối
 * là lần đầu tiên, dòng đầu là hiện tại.
 */
const LOAI: Record<string, { ten: string; tone: "ok" | "warn" | "neutral" }> = {
  RECEIPT: { ten: "Nhập kho", tone: "ok" },
  SALE: { ten: "Bán hàng", tone: "neutral" },
  RETURN: { ten: "Khách trả", tone: "ok" },
  CANCEL: { ten: "Huỷ đơn", tone: "ok" },
  ADJUST: { ten: "Kiểm kê", tone: "warn" },
  TRANSFER: { ten: "Chuyển kho", tone: "neutral" },
};

export default async function StockLedgerPage({
  params,
}: {
  params: Promise<{ sku: string }>;
}) {
  await requirePermission("kho.xem");
  const { sku } = await params;

  const bien = await db.variant.findUnique({
    where: { sku: decodeURIComponent(sku) },
    select: {
      id: true,
      sku: true,
      color: true,
      size: true,
      stock: true,
      lowStockAt: true,
      product: { select: { name: true, slug: true } },
    },
  });
  if (!bien) notFound();

  const [dong, kho] = await Promise.all([listMovements(bien.id, 200), tonTheoKho(bien.id)]);

  /*
   * Cộng ngược từ dòng cũ nhất để ra "còn lại sau mỗi lần". Nếu con số cuối
   * cùng không khớp `stock` thì sổ và tồn đã lệch — hiện thẳng ra thay vì giấu.
   */
  const cu = [...dong].reverse();
  const conLai: number[] = [];
  let luy = 0;
  for (const d of cu) {
    luy += d.delta;
    conLai.push(luy);
  }
  conLai.reverse();

  const tongSo = luy;
  const lech = tongSo !== bien.stock;

  return (
    <div>
      <Link
        href="/admin/ton-kho"
        className="mb-3.5 inline-flex min-h-11 items-center text-[12.5px] font-extrabold text-accent"
      >
        ← QUAY LẠI TỒN KHO
      </Link>

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b-2 border-border-soft pb-3.5">
        <div>
          <h1 className="font-mono text-[24px] font-bold lg:text-[30px]">{bien.sku}</h1>
          <p className="mt-1.5 text-[13.5px] text-muted">
            {bien.product.name} · {bien.color} · Size {bien.size} · ngưỡng cảnh báo{" "}
            {bien.lowStockAt}
          </p>
        </div>
        <div className="text-right">
          <p className="label-tech">TỒN HIỆN TẠI</p>
          <p className="text-[30px] font-extrabold leading-none">{bien.stock}</p>
        </div>
      </div>

      {/* Tồn tách theo kho: một con số chung không trả lời được "kho Hà Nội
          còn mấy cái", mà đó đúng là câu thủ kho phải trả lời hằng ngày. */}
      <div className="mb-6">
        <p className="label-tech mb-2.5 font-bold">TỒN THEO KHO</p>
        <dl className="grid gap-px border-2 border-divider bg-divider sm:grid-cols-3">
          {kho.map((k) => (
            <div key={k.id} className="bg-bg p-4">
              <dt className="text-[12.5px] text-muted">
                {k.name}
                {k.isMain ? " · kho chính" : ""}
              </dt>
              <dd className="mt-1 text-[24px] font-extrabold leading-none">{k.qty}</dd>
            </div>
          ))}
        </dl>
        <TransferForm variantId={bien.id} kho={kho} />
      </div>

      {lech ? (
        <p
          role="alert"
          className="mb-5 border-2 border-accent bg-accent-100 px-4 py-3 text-[13.5px] font-semibold text-accent-800"
        >
          Sổ cộng lại ra {tongSo} nhưng tồn đang ghi {bien.stock}. Hai số này phải bằng nhau —
          báo cho người quản trị kiểm tra.
        </p>
      ) : null}

      {dong.length === 0 ? (
        <p className="border border-dashed border-border-soft bg-subtle px-5 py-10 text-[14px] text-muted">
          Biến thể này chưa có dòng sổ nào. Nhập hàng qua màn Nhập kho để bắt đầu.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr>
                {["THỜI ĐIỂM", "LOẠI", "THAY ĐỔI", "CÒN LẠI", "NGƯỜI THAO TÁC", "GHI CHÚ"].map(
                  (h, i) => (
                    <th
                      key={h}
                      className={
                        "label-tech whitespace-nowrap border-b-2 border-border-soft py-2 pr-3 font-bold " +
                        (i === 2 || i === 3 ? "text-right" : "text-left")
                      }
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {dong.map((d, i) => {
                const loai = LOAI[d.type] ?? { ten: d.type, tone: "neutral" as const };
                return (
                  <tr key={d.id}>
                    <td className="whitespace-nowrap border-b border-hairline py-2 pr-3 font-mono text-[12px]">
                      {formatDateTime(d.createdAt)}
                    </td>
                    <td className="border-b border-hairline py-2 pr-3">
                      <Badge tone={loai.tone}>{loai.ten}</Badge>
                    </td>
                    <td
                      className={
                        "border-b border-hairline py-2 pr-3 text-right font-mono font-bold " +
                        (d.delta < 0 ? "text-accent-700" : "")
                      }
                    >
                      {d.delta > 0 ? "+" : ""}
                      {d.delta}
                    </td>
                    <td className="border-b border-hairline py-2 pr-3 text-right font-mono">
                      {conLai[i]}
                    </td>
                    <td className="border-b border-hairline py-2 pr-3">{d.actorName ?? "—"}</td>
                    <td className="border-b border-hairline py-2 text-muted">{d.note ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
