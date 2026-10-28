"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import { Dialog } from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { addToCartAction } from "@/app/gio-hang/actions";
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

export type Accordion = { title: string; body: string };

/**
 * Khối mua hàng theo mockup: swatch màu 44px, chip size, bộ đếm số lượng, hai
 * nút hành động, rồi các mục gập. Size hết hàng ở màu đang chọn bị vô hiệu hoá
 * chứ không biến mất — khách cần thấy là có size đó nhưng đang hết.
 */
export function VariantPicker({
  variants,
  basePrice,
  salePrice,
  sizeChart,
  accordions,
}: {
  variants: PickerVariant[];
  basePrice: number;
  salePrice: number | null;
  sizeChart: SizeChart | null;
  accordions: Accordion[];
}) {
  const colors = React.useMemo(() => {
    const seen = new Map<string, { hex: string; stock: number }>();
    for (const v of variants) {
      const cur = seen.get(v.color);
      if (cur) cur.stock += v.stock;
      else seen.set(v.color, { hex: v.colorHex, stock: v.stock });
    }
    return [...seen.entries()].map(([color, v]) => ({ color, ...v }));
  }, [variants]);

  const sizes = React.useMemo(
    () => [...new Set(variants.map((v) => v.size))].sort(compareSizes),
    [variants],
  );

  const [color, setColor] = React.useState(
    () => (colors.find((c) => c.stock > 0) ?? colors[0])?.color ?? "",
  );
  const [size, setSize] = React.useState("");
  const [qty, setQty] = React.useState(1);
  const [chartOpen, setChartOpen] = React.useState(false);
  const [openPanel, setOpenPanel] = React.useState(0);
  const toast = useToast();
  const router = useRouter();
  const [saving, startSaving] = React.useTransition();

  /** Chưa chọn size thì không thêm được — biến thể mới là thứ có tồn kho. */
  const add = (then: "stay" | "checkout") => {
    if (!selected) {
      toast("Chọn size trước khi thêm vào giỏ.", "error");
      return;
    }
    const form = new FormData();
    form.set("variantId", selected.id);
    form.set("qty", String(qty));

    startSaving(async () => {
      const res = await addToCartAction(form);
      if (!res.ok) {
        toast(res.message, "error");
        return;
      }
      if (then === "checkout") router.push("/thanh-toan");
      else {
        router.refresh();
        toast("Đã thêm vào giỏ.");
      }
    });
  };

  const forColor = variants.filter((v) => v.color === color);
  const selected = forColor.find((v) => v.size === size) ?? null;

  // Đổi màu thì size cũ có thể không còn — bỏ chọn thay vì giữ lựa chọn sai.
  React.useEffect(() => {
    if (!variants.some((v) => v.color === color && v.size === size && v.stock > 0)) setSize("");
  }, [color, size, variants]);

  const unitPrice = (salePrice ?? basePrice) + (selected?.priceDelta ?? 0);
  const off = salePrice ? Math.round(((basePrice - salePrice) / basePrice) * 100) : null;
  const colorStock = forColor.reduce((s, v) => s + v.stock, 0);

  return (
    <div>
      <div className="flex flex-wrap items-baseline gap-3.5 pt-2">
        <span
          className={cn(
            "text-[34px] font-extrabold leading-none tracking-[-0.02em]",
            salePrice && "text-accent",
          )}
        >
          {formatVnd(unitPrice)}
        </span>
        {salePrice ? (
          <>
            <span className="text-[17px] text-muted line-through">
              {formatVnd(basePrice + (selected?.priceDelta ?? 0))}
            </span>
            <span className="rounded-full bg-accent px-2.5 py-1.5 text-[12px] font-bold leading-none text-bg">
              −{off}%
            </span>
          </>
        ) : null}
      </div>

      <p
        className={cn(
          "mb-7 mt-2.5 text-[13px] font-semibold",
          colorStock === 0 ? "text-text" : "text-muted",
        )}
      >
        <StockText variant={selected} chosen={Boolean(size)} colorStock={colorStock} />
      </p>

      {/* ── Màu ── */}
      <div className="label-tech mb-2.5 font-bold">MÀU — {color}</div>
      <div className="mb-6 flex flex-wrap gap-2">
        {colors.map((c) => (
          <button
            key={c.color}
            type="button"
            aria-label={"Chọn màu " + c.color}
            aria-pressed={c.color === color}
            disabled={c.stock === 0}
            title={c.stock === 0 ? c.color + " — hết hàng" : c.color}
            onClick={() => setColor(c.color)}
            className={cn(
              "h-11 w-11 rounded-full p-1 transition-shadow",
              c.color === color
                ? "shadow-[inset_0_0_0_2px_var(--color-text)]"
                : "shadow-[inset_0_0_0_1px_rgba(21,20,19,0.1)] hover:shadow-[inset_0_0_0_1px_rgba(21,20,19,0.3)]",
            )}
          >
            <span
              className="block h-full w-full rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)]"
              style={{ background: c.hex }}
            />
          </button>
        ))}
      </div>

      {/* ── Size ── */}
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <div className="label-tech font-bold">SIZE{size ? " — " + size : ""}</div>
        {sizeChart ? (
          <button
            type="button"
            onClick={() => setChartOpen(true)}
            className="-my-2 flex min-h-11 items-center px-1 text-[13px] font-semibold underline decoration-1 underline-offset-4 hover:text-muted lg:my-0 lg:min-h-0 lg:px-0"
          >
            Bảng size
          </button>
        ) : null}
      </div>

      <div className="mb-2 flex flex-wrap gap-2">
        {sizes.map((s) => {
          const v = forColor.find((x) => x.size === s);
          const out = !v || v.stock === 0;
          return (
            <button
              key={s}
              type="button"
              aria-pressed={s === size}
              disabled={out}
              title={out ? s + " — hết hàng ở màu " + color : s}
              onClick={() => setSize(s)}
              className={cn(
                "h-[50px] min-w-[62px] rounded-lg px-3 text-[13.5px] font-bold transition-colors",
                s === size ? "bg-neutral-900 text-bg" : "bg-field hover:bg-field-hover",
                out && "line-through opacity-40",
              )}
            >
              {s}
            </button>
          );
        })}
      </div>

      <p className="mb-7 text-[12.5px] text-faint">
        {sizes.includes("XXL")
          ? "Size XXL phụ thu 20.000 ₫. Không vừa thì đổi size miễn phí trong 15 ngày."
          : "Không vừa thì đổi size miễn phí trong 15 ngày."}
      </p>

      {/* ── Số lượng + hành động ──
          Dưới `lg:` khối này dính đáy màn hình để nút mua luôn trong tầm ngón
          tay; từ `lg:` trở lên nó nằm đúng trong luồng như mockup desktop. */}
      <div
        className={cn(
          "z-40 mb-3 flex gap-3",
          "max-lg:sticky max-lg:bottom-0 max-lg:-mx-4 max-lg:bg-bg/85 max-lg:px-4 max-lg:py-3 max-lg:backdrop-blur-xl",
          "max-lg:pb-[max(0.75rem,env(safe-area-inset-bottom))]",
        )}
      >
        <div className="flex items-center rounded-full bg-field px-1">
          <button
            type="button"
            aria-label="Giảm số lượng"
            onClick={() => setQty((n) => Math.max(1, n - 1))}
            className="h-11 w-11 rounded-full text-[19px] hover:bg-field-hover"
          >
            −
          </button>
          <span className="w-11 text-center text-[15px] font-extrabold">{qty}</span>
          <button
            type="button"
            aria-label="Tăng số lượng"
            onClick={() => setQty((n) => Math.min(selected?.stock || 99, n + 1))}
            className="h-11 w-11 rounded-full text-[19px] hover:bg-field-hover"
          >
            +
          </button>
        </div>

        {/* Giỏ hàng thuộc M2. Giữ đúng màu mockup và báo bằng toast thay vì để
            nút xám — nút xám ở đây đọc như giao diện hỏng. */}
        <button
          type="button"
          onClick={() => add("stay")}
          disabled={saving}
          className="h-[54px] flex-1 rounded-full bg-accent px-6 text-[15px] font-semibold text-bg transition-[background-color,box-shadow,transform] hover:bg-accent-600 hover:shadow-raised active:scale-[0.97] justify-center"
        >
          Thêm vào giỏ
        </button>
      </div>

      {/* Mockup mobile chỉ có một nút mua ở thanh đáy; nút thứ hai là của desktop. */}
      <button
        type="button"
        onClick={() => add("checkout")}
        disabled={saving}
        className="mb-7 hidden h-[54px] w-full rounded-full bg-neutral-900 px-6 text-[15px] font-semibold text-bg transition-[box-shadow,transform] hover:shadow-raised active:scale-[0.97] lg:block"
      >
        Đặt hàng ngay
      </button>

      {/* ── Mục gập ── */}
      <div className="flex flex-col gap-1.5">
        {accordions.map((a, i) => {
          const open = openPanel === i;
          return (
            <div
              key={a.title}
              className={cn(
                "rounded-[18px] px-[18px] transition-[background-color,box-shadow]",
                open ? "bg-surface shadow-soft" : "bg-[rgba(21,20,19,0.04)]",
              )}
            >
              <button
                type="button"
                aria-expanded={open}
                onClick={() => setOpenPanel(open ? -1 : i)}
                className="flex w-full items-center justify-between py-4 text-left text-[14px] font-semibold"
              >
                {a.title}
                <span
                  aria-hidden
                  className={cn(
                    "text-[18px] leading-none transition-transform duration-300",
                    open && "rotate-45",
                  )}
                >
                  +
                </span>
              </button>
              {open ? (
                <p className="mb-4 whitespace-pre-line text-[14px] leading-[1.7] text-muted">
                  {a.body}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>

      {sizeChart ? (
        <Dialog
          open={chartOpen}
          onClose={() => setChartOpen(false)}
          title={sizeChart.title}
          width={620}
        >
          <p className="mb-5 text-[14px] text-muted">{sizeChart.fit}</p>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr>
                  {sizeChart.columns.map((c, i) => (
                    <th
                      key={c}
                      className={cn(
                        "border-b-2 border-divider py-2.5 text-[11px] font-bold uppercase tracking-[0.08em] text-faint",
                        i === 0 ? "text-left" : "text-center",
                      )}
                    >
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sizeChart.rows.map((r) => (
                  <tr key={r.size} className={r.size === size ? "bg-subtle" : undefined}>
                    <td className="border-b border-hairline py-2.5 font-extrabold">{r.size}</td>
                    {r.values.map((v, i) => (
                      <td
                        key={i}
                        className={cn(
                          "border-b border-hairline py-2.5 text-center",
                          i < r.values.length - 1 && "tabular-nums",
                        )}
                      >
                        {v}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 className="mb-2 mt-6 text-[13px] font-extrabold uppercase tracking-[0.08em]">
            Cách đo
          </h3>
          <ul className="flex list-disc flex-col gap-1.5 pl-5 text-[13px] text-muted">
            {sizeChart.howTo.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
          <p className="mt-4 text-[13px] text-faint">Đơn vị: cm. Sai số cho phép ±1cm.</p>
        </Dialog>
      ) : null}
    </div>
  );
}

function StockText({
  variant,
  chosen,
  colorStock,
}: {
  variant: PickerVariant | null;
  chosen: boolean;
  colorStock: number;
}) {
  if (colorStock === 0) return <>Màu này đang hết hàng.</>;
  if (!chosen || !variant) return <>Chọn size để xem tồn kho.</>;
  if (variant.stock === 0) return <>Hết hàng ở lựa chọn này.</>;
  if (variant.stock <= variant.lowStockAt) {
    return <>Sắp hết — còn {variant.stock} sản phẩm · SKU {variant.sku}</>;
  }
  return <>Còn hàng · SKU {variant.sku}</>;
}
