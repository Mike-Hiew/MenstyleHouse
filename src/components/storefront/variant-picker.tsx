"use client";

import * as React from "react";
import { Ruler, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { Table, Td, Th } from "@/components/ui/table";
import { compareSizes } from "@/lib/catalog";
import { formatVnd } from "@/lib/money";
import type { SizeChart } from "@/lib/size-chart";

export type PickerVariant = {
  id: string;
  sku: string;
  color: string;
  colorHex: string;
  size: string;
  stock: number;
  lowStockAt: number;
  priceDelta: number;
};

/**
 * Chọn màu rồi chọn size. Size hết hàng ở màu đang chọn thì bị vô hiệu hoá chứ
 * không biến mất — khách cần thấy là có size đó nhưng đang hết.
 */
export function VariantPicker({
  variants,
  basePrice,
  salePrice,
  sizeChart,
}: {
  variants: PickerVariant[];
  basePrice: number;
  salePrice: number | null;
  sizeChart: SizeChart | null;
}) {
  const colors = React.useMemo(() => {
    const seen = new Map<string, string>();
    for (const v of variants) if (!seen.has(v.color)) seen.set(v.color, v.colorHex);
    return [...seen.entries()].map(([color, hex]) => ({
      color,
      hex,
      stock: variants.filter((v) => v.color === color).reduce((s, v) => s + v.stock, 0),
    }));
  }, [variants]);

  const sizes = React.useMemo(
    () => [...new Set(variants.map((v) => v.size))].sort(compareSizes),
    [variants],
  );

  const [color, setColor] = React.useState(() => (colors.find((c) => c.stock > 0) ?? colors[0])?.color ?? "");
  const [size, setSize] = React.useState("");
  const [chartOpen, setChartOpen] = React.useState(false);

  const forColor = variants.filter((v) => v.color === color);
  const selected = forColor.find((v) => v.size === size) ?? null;

  // Đổi màu thì size cũ có thể không còn — bỏ chọn thay vì giữ lựa chọn sai.
  React.useEffect(() => {
    const ok = variants.some((v) => v.color === color && v.size === size && v.stock > 0);
    if (!ok) setSize("");
  }, [color, size, variants]);

  const unitPrice = (salePrice ?? basePrice) + (selected?.priceDelta ?? 0);
  const hasDelta = sizes.some((s) => (forColor.find((v) => v.size === s)?.priceDelta ?? 0) > 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-baseline gap-3">
        <span className="font-mono text-[28px] font-bold leading-none">{formatVnd(unitPrice)}</span>
        {salePrice ? (
          <>
            <span className="font-mono text-[16px] text-neutral-400 line-through">
              {formatVnd(basePrice + (selected?.priceDelta ?? 0))}
            </span>
            <Badge tone="warn">
              −{Math.round(((basePrice - salePrice) / basePrice) * 100)}%
            </Badge>
          </>
        ) : null}
      </div>

      {/* ── Màu ── */}
      <fieldset>
        <legend className="mb-2.5 flex w-full items-center gap-2 text-[12px] font-bold uppercase tracking-[0.08em] text-neutral-600">
          Màu sắc
          <span className="font-semibold normal-case tracking-normal text-text">{color}</span>
        </legend>
        <div className="flex flex-wrap gap-2">
          {colors.map((c) => (
            <button
              key={c.color}
              type="button"
              aria-pressed={c.color === color}
              disabled={c.stock === 0}
              onClick={() => setColor(c.color)}
              title={c.stock === 0 ? c.color + " — hết hàng" : c.color}
              className={cn(
                "flex items-center gap-2 border-2 px-3 py-2 text-[13px] font-semibold",
                c.color === color ? "border-accent bg-accent-100" : "border-divider hover:bg-neutral-200",
                c.stock === 0 && "opacity-40 line-through",
              )}
            >
              <span
                className="h-4 w-4 border border-hairline"
                style={{ background: c.hex }}
                aria-hidden
              />
              {c.color}
            </button>
          ))}
        </div>
      </fieldset>

      {/* ── Size ── */}
      <fieldset>
        <legend className="mb-2.5 flex w-full items-center justify-between gap-2 text-[12px] font-bold uppercase tracking-[0.08em] text-neutral-600">
          <span>
            Kích cỡ
            {size ? <span className="ml-2 font-semibold normal-case tracking-normal text-text">{size}</span> : null}
          </span>
          {sizeChart ? (
            <button
              type="button"
              onClick={() => setChartOpen(true)}
              className="inline-flex items-center gap-1.5 font-bold uppercase tracking-[0.08em] text-accent-700 hover:underline"
            >
              <Ruler size={14} aria-hidden />
              Bảng size
            </button>
          ) : null}
        </legend>

        <div className="flex flex-wrap gap-2">
          {sizes.map((s) => {
            const v = forColor.find((x) => x.size === s);
            const out = !v || v.stock === 0;
            return (
              <button
                key={s}
                type="button"
                aria-pressed={s === size}
                disabled={out}
                onClick={() => setSize(s)}
                title={out ? s + " — hết hàng ở màu " + color : s}
                className={cn(
                  "min-w-14 border-2 px-3 py-2 text-[13px] font-semibold",
                  s === size ? "border-accent bg-accent-100" : "border-divider hover:bg-neutral-200",
                  out && "opacity-40 line-through",
                )}
              >
                {s}
              </button>
            );
          })}
        </div>

        {hasDelta ? (
          <p className="mt-2 text-[12px] text-neutral-500">Size XXL phụ thu 20.000đ.</p>
        ) : null}
      </fieldset>

      {/* ── Tồn kho + đặt hàng ── */}
      <div className="flex flex-col gap-2 border-t-2 border-divider pt-5">
        <StockLine variant={selected} chosen={Boolean(size)} />

        {/* M1 chỉ đọc — nút để đúng chỗ nhưng ở dạng phụ, không giả vờ bấm được. */}
        <Button size="lg" variant="secondary" block disabled className="justify-center">
          <ShoppingBag size={18} />
          Thêm vào giỏ
        </Button>
        <p className="text-[12px] text-neutral-500">
          Đặt hàng mở ở bước tiếp theo. Hiện tại bạn xem được đầy đủ thông tin sản phẩm.
        </p>
      </div>

      {sizeChart ? (
        <Dialog open={chartOpen} onClose={() => setChartOpen(false)} title={sizeChart.title} width={720}>
          <p className="mb-4 text-[14px] text-neutral-600">{sizeChart.fit}</p>

          <Table>
            <thead>
              <tr>
                {sizeChart.columns.map((c) => (
                  <Th key={c} align={c === "Size" ? "left" : "center"}>
                    {c}
                  </Th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sizeChart.rows.map((r) => (
                <tr key={r.size} className={r.size === size ? "bg-accent-100" : undefined}>
                  <Td className="font-bold">{r.size}</Td>
                  {r.values.map((v, i) => (
                    <Td key={i} align="center" mono={i < r.values.length - 1}>
                      {v}
                    </Td>
                  ))}
                </tr>
              ))}
            </tbody>
          </Table>

          <h3 className="mb-2 mt-5 text-[13px] font-extrabold uppercase tracking-[0.08em]">
            Cách đo
          </h3>
          <ul className="flex list-disc flex-col gap-1.5 pl-5 text-[13px] text-neutral-600">
            {sizeChart.howTo.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
          <p className="mt-4 text-[13px] text-neutral-500">Đơn vị: cm. Sai số cho phép ±1cm.</p>
        </Dialog>
      ) : null}
    </div>
  );
}

function StockLine({ variant, chosen }: { variant: PickerVariant | null; chosen: boolean }) {
  if (!chosen || !variant) {
    return <p className="text-[13px] text-neutral-500">Chọn size để xem tồn kho.</p>;
  }

  if (variant.stock === 0) {
    return <p className="text-[13px] font-semibold text-accent-700">Hết hàng ở lựa chọn này.</p>;
  }

  return (
    <p className="flex flex-wrap items-center gap-2 text-[13px]">
      {variant.stock <= variant.lowStockAt ? (
        <span className="font-semibold text-accent-700">Sắp hết — còn {variant.stock} sản phẩm</span>
      ) : (
        <span className="font-semibold">Còn hàng</span>
      )}
      <span className="font-mono text-[12px] text-neutral-500">SKU {variant.sku}</span>
    </p>
  );
}
