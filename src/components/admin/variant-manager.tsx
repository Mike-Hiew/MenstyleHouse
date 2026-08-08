"use client";

import { useActionState } from "react";
import { cn } from "@/lib/cn";
import { formatVnd } from "@/lib/money";
import { addVariantAction, deleteVariantAction, type AdminActionState } from "@/app/admin/actions";

export type VariantRow = {
  id: string;
  sku: string;
  color: string;
  colorHex: string;
  size: string;
  stock: number;
  lowStockAt: number;
  priceDelta: number;
  /** Đã có lịch sử kho hoặc đã bán — xoá được hay không quyết định ở server. */
  khoaXoa: boolean;
};

/**
 * Bảng biến thể ở màn sửa sản phẩm.
 *
 * **Không có ô tồn kho** và sẽ không bao giờ có. Mockup desktop vẽ một ô nhập
 * tồn ở đây; làm theo là phá luật số 2 trong `docs/CLAUDE-rules.md` — tồn chỉ
 * đổi qua `moveStock` và luôn kèm một dòng sổ. Cột tồn dưới đây chỉ để đọc.
 *
 * Nút xoá chỉ hiện với biến thể chưa có lịch sử. Biến thể đã bán mà xoá là làm
 * mồ côi `InventoryMovement`, và bất biến `stock === Σ(movements.delta)` hết
 * kiểm được.
 */
export function VariantManager({
  slug,
  variants,
  goiY,
}: {
  slug: string;
  variants: VariantRow[];
  goiY: { colors: { color: string; colorHex: string }[]; sizes: string[] };
}) {
  const [addState, add, adding] = useActionState<AdminActionState, FormData>(addVariantAction, {});
  const [delState, remove] = useActionState<AdminActionState, FormData>(deleteVariantAction, {});

  const notice = addState.message ?? delState.message;
  const noticeOk = addState.message ? addState.ok : delState.ok;

  return (
    <section>
      <h2 className="mb-3 border-b-2 border-border-soft pb-2.5 text-[16px] font-extrabold">
        Biến thể — size × màu
      </h2>

      {notice ? (
        <p
          role="alert"
          className={cn(
            "mb-4 border-2 px-3.5 py-2.5 text-[13px] font-semibold",
            noticeOk ? "border-divider bg-subtle" : "border-accent bg-accent-100 text-accent-800",
          )}
        >
          {notice}
        </p>
      ) : null}

      {variants.length === 0 ? (
        <p className="mb-4 border border-dashed border-border-soft bg-subtle px-4 py-6 text-[13.5px] text-muted">
          Chưa có biến thể nào. Sản phẩm chưa có biến thể thì khách không mua được — thêm ít nhất
          một cái bên dưới.
        </p>
      ) : (
        <div className="mb-4 overflow-x-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr>
                {["SKU", "MÀU", "SIZE", "CHÊNH GIÁ", "TỒN", ""].map((h, i) => (
                  <th
                    key={h || i}
                    className={cn(
                      "label-tech whitespace-nowrap border-b-2 border-border-soft py-2 pr-3 font-bold",
                      i >= 3 ? "text-right" : "text-left",
                    )}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {variants.map((v) => (
                <tr key={v.id}>
                  <td className="border-b border-hairline py-2 pr-3 font-mono text-[12px]">
                    {v.sku}
                  </td>
                  <td className="border-b border-hairline py-2 pr-3">
                    <span className="flex items-center gap-2 whitespace-nowrap">
                      <span
                        className="h-3.5 w-3.5 flex-none border border-hairline"
                        style={{ background: v.colorHex }}
                        aria-hidden
                      />
                      {v.color}
                    </span>
                  </td>
                  <td className="border-b border-hairline py-2 pr-3">{v.size}</td>
                  <td className="border-b border-hairline py-2 pr-3 text-right font-mono">
                    {v.priceDelta === 0
                      ? "—"
                      : (v.priceDelta > 0 ? "+" : "−") + formatVnd(Math.abs(v.priceDelta))}
                  </td>
                  <td
                    className={cn(
                      "border-b border-hairline py-2 pr-3 text-right font-mono",
                      v.stock === 0 && "font-bold text-accent-700",
                      v.stock > 0 && v.stock <= v.lowStockAt && "font-bold",
                    )}
                  >
                    {v.stock}
                  </td>
                  <td className="border-b border-hairline py-2 text-right">
                    {v.khoaXoa ? (
                      <span className="text-[12px] text-faint">đã có lịch sử</span>
                    ) : (
                      <form action={remove}>
                        <input type="hidden" name="slug" value={slug} />
                        <input type="hidden" name="variantId" value={v.id} />
                        <button
                          type="submit"
                          className="flex min-h-11 items-center text-[12px] text-faint underline"
                        >
                          Xoá
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <form action={add} className="border-2 border-border-soft p-4">
        <input type="hidden" name="slug" value={slug} />
        <p className="label-tech mb-3 font-bold">THÊM BIẾN THỂ</p>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_auto_1fr_1fr_auto]">
          <label className="block">
            <span className="mb-1.5 block text-[12px] font-semibold">Màu</span>
            <input
              name="color"
              list="mau-da-dung"
              required
              placeholder="Đen"
              className={o}
            />
            <datalist id="mau-da-dung">
              {goiY.colors.map((c) => (
                <option key={c.color} value={c.color} />
              ))}
            </datalist>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[12px] font-semibold">Mã màu</span>
            <input
              type="color"
              name="colorHex"
              defaultValue="#201e1d"
              className="h-[46px] w-full min-w-[60px] cursor-pointer border border-border-soft bg-bg p-1"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[12px] font-semibold">Size</span>
            <input name="size" list="size-da-dung" required placeholder="L" className={o} />
            <datalist id="size-da-dung">
              {goiY.sizes.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[12px] font-semibold">Chênh giá (₫)</span>
            <input name="priceDelta" inputMode="numeric" defaultValue={0} className={o} />
          </label>

          <button
            type="submit"
            disabled={adding}
            className="min-h-12 self-end bg-accent px-5 text-[13.5px] font-extrabold text-bg disabled:opacity-60"
          >
            {adding ? "Đang thêm…" : "THÊM"}
          </button>
        </div>

        <input type="hidden" name="lowStockAt" value={10} />

        <p className="mt-3 text-[12.5px] leading-[1.6] text-faint">
          SKU sinh tự động từ mã sản phẩm, màu và size. Biến thể mới có tồn <strong>0</strong> —
          hàng vào kho bằng phiếu nhập, không khai ở đây.
        </p>
      </form>
    </section>
  );
}

const o =
  "w-full border border-border-soft bg-bg px-3 py-2.5 text-[16px] outline-none focus:border-accent lg:text-[14px]";
