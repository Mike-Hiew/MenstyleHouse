"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import { SORTS, type Facets, type SortKey } from "@/lib/catalog";
import { readList, setValue, toggleValue } from "@/lib/search-params";
import { formatVnd } from "@/lib/money";

/**
 * Các nhóm lọc là thành phần *điều khiển được*: nhận một `URLSearchParams` và
 * trả về bản mới. Nhờ vậy desktop áp ngay còn mobile giữ bản nháp trong sheet
 * rồi mới áp khi bấm "Áp dụng" — khác biệt có chủ ý, ghi trong
 * `docs/RESPONSIVE.md`.
 *
 * Bố cục và nội dung bám sheet lọc của mockup: danh mục và màu là checkbox
 * **có số đếm**, size là chip (hết hàng thì mờ và không bấm được), giá là **một
 * thanh kéo "giá tối đa"** — mockup chỉ có một cận trên, không có ô "giá từ".
 */

export type FilterFieldsProps = {
  value: URLSearchParams;
  onChange: (next: URLSearchParams) => void;
  facets: Facets;
  /** Trang /danh-muc/[slug] khoá danh mục nên ẩn nhóm lọc danh mục. */
  lockCategory?: boolean;
};

const LABEL = "label-tech mb-2.5 font-bold";

export function FilterFields({ value, onChange, facets, lockCategory }: FilterFieldsProps) {
  const cats = readList(value, "danh-muc");
  const colors = readList(value, "mau");
  const sizes = readList(value, "size");
  const brands = readList(value, "thuong-hieu");

  return (
    <>
      {lockCategory ? null : (
        <section className="mb-6">
          <div className={LABEL}>DANH MỤC</div>
          {facets.categories.map((c) => (
            <CountRow
              key={c.value}
              label={c.label}
              count={c.count}
              checked={cats.includes(c.value)}
              onToggle={() => onChange(toggleValue(value, "danh-muc", c.value))}
            />
          ))}
        </section>
      )}

      <section className="mb-6">
        <div className={LABEL}>SIZE</div>
        <div className="flex flex-wrap gap-1.5">
          {facets.sizes.map((s) => {
            const on = sizes.includes(s.value);
            const out = s.count === 0 && !on;
            return (
              <button
                key={s.value}
                type="button"
                aria-pressed={on}
                disabled={out}
                title={out ? s.label + " — không có sản phẩm nào" : s.label}
                onClick={() => onChange(toggleValue(value, "size", s.value))}
                className={cn(
                  // Ô size là đích chạm thật: tối thiểu 44px trên mobile.
                  "flex h-11 min-w-11 items-center justify-center border px-3.5 text-[12px] font-extrabold lg:h-9 lg:min-w-9",
                  on
                    ? "border-accent bg-accent text-bg"
                    : "border-border-soft hover:bg-subtle",
                  out && "opacity-40",
                )}
              >
                {s.value}
              </button>
            );
          })}
        </div>
      </section>

      {facets.colors.length > 0 ? (
        <section className="mb-6">
          <div className={LABEL}>MÀU</div>
          <div className="flex flex-wrap gap-2">
            {facets.colors.map((c) => {
              const on = colors.includes(c.value);
              const out = c.count === 0 && !on;
              return (
                <button
                  key={c.value}
                  type="button"
                  aria-label={c.label + " — " + c.count + " sản phẩm"}
                  aria-pressed={on}
                  disabled={out}
                  title={c.label + " · " + c.count}
                  onClick={() => onChange(toggleValue(value, "mau", c.value))}
                  className={cn(
                    "h-11 w-11 border-2 p-[3px]",
                    on ? "border-accent" : "border-hairline hover:border-faint",
                    out && "opacity-30",
                  )}
                >
                  <span className="block h-full w-full" style={{ background: c.hex }} />
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      <PriceSlider
        floor={facets.priceFloor}
        ceil={facets.priceCeil}
        value={value.get("gia-den") ?? ""}
        onCommit={(v) => onChange(setValue(value, "gia-den", v))}
      />

      <section className="mb-6">
        <div className={LABEL}>THƯƠNG HIỆU</div>
        {facets.brands.map((b) => (
          <CountRow
            key={b.value}
            label={b.label}
            count={b.count}
            checked={brands.includes(b.value)}
            onToggle={() => onChange(toggleValue(value, "thuong-hieu", b.value))}
          />
        ))}
      </section>

      <section className="mb-5">
        <div className={LABEL}>KHUYẾN MÃI</div>
        <CountRow
          label="Đang giảm giá"
          count={facets.sale}
          checked={value.get("km") === "1"}
          onToggle={() => onChange(setValue(value, "km", value.get("km") === "1" ? null : "1"))}
        />
      </section>
    </>
  );
}

function CountRow({
  label,
  count,
  checked,
  onToggle,
}: {
  label: string;
  count: number;
  checked: boolean;
  onToggle: () => void;
}) {
  const off = count === 0 && !checked;
  return (
    <label
      className={cn(
        "flex min-h-11 items-center gap-2.5 text-[13.5px] lg:min-h-9",
        off ? "cursor-not-allowed text-neutral-400" : "cursor-pointer",
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={off}
        onChange={onToggle}
        className="h-[18px] w-[18px] flex-none accent-accent"
      />
      <span className="flex-1">{label}</span>
      <span className="font-mono text-[12px] text-faint">{count}</span>
    </label>
  );
}

const BUOC = 10_000;

/**
 * Một thanh kéo "giá tối đa", đúng mockup:
 * `<input type="range" min max step="10000" aria-label="Giá tối đa">`.
 *
 * Ba điều đáng ghi:
 *
 * 1. **Cận trên là giá của sản phẩm đắt nhất đang xem**, không phải một con số
 *    viết cứng. Kéo hết thanh mà vẫn còn hàng bị lọc mất là thanh nói dối.
 * 2. **Kéo thì không tải lại, thả tay mới tải.** `onChange` của `type=range`
 *    bắn liên tục theo từng pixel; áp thẳng vào URL là mỗi lần kéo gọi server
 *    vài chục lần. Số bên trên vẫn chạy theo tay nhờ trạng thái cục bộ.
 * 3. **Kéo hết sang phải là bỏ lọc** (xoá tham số khỏi URL), chứ không phải lọc
 *    "≤ giá cao nhất" — giữ tham số lại thì bộ đếm bộ lọc báo đang bật một cái
 *    lọc chẳng loại được gì.
 */
function PriceSlider({
  floor,
  ceil,
  value,
  onCommit,
}: {
  floor: number;
  ceil: number;
  value: string;
  onCommit: (v: string | null) => void;
}) {
  const trong = (v: number) => Math.min(ceil, Math.max(floor, v));
  const tuUrl = value ? trong(Number(value)) : ceil;

  const [draft, setDraft] = React.useState(tuUrl);
  React.useEffect(() => setDraft(tuUrl), [tuUrl]);

  // Còn một mức giá duy nhất thì thanh kéo không kéo được đi đâu; ẩn đi thay vì
  // bày ra một ô điều khiển bấm vào không có tác dụng gì.
  if (!(ceil > floor)) return null;

  const commit = (v: number) => {
    const next = v >= ceil ? null : String(v);
    if ((next ?? "") === value) return;
    onCommit(next);
  };

  return (
    <section className="mb-6">
      <div className={LABEL}>GIÁ TỐI ĐA — {formatVnd(draft)}</div>
      <input
        type="range"
        aria-label="Giá tối đa"
        min={floor}
        max={ceil}
        step={BUOC}
        value={draft}
        onChange={(e) => setDraft(Number(e.target.value))}
        onPointerUp={(e) => commit(Number(e.currentTarget.value))}
        onKeyUp={(e) => commit(Number(e.currentTarget.value))}
        onBlur={(e) => commit(Number(e.currentTarget.value))}
        className="h-11 w-full accent-accent lg:h-8"
      />
    </section>
  );
}

/** Cột lọc cố định bên trái, chỉ hiện từ `lg:`. Mỗi thao tác áp dụng ngay. */
export function FilterSidebar({
  value,
  onChange,
  facets,
  lockCategory,
  onClear,
}: FilterFieldsProps & { onClear: () => void }) {
  return (
    <aside
      aria-label="Bộ lọc sản phẩm"
      className="hidden self-start border-t-2 border-divider pt-4 lg:sticky lg:top-[120px] lg:block"
    >
      <h2 className="mb-4 text-[16px] font-extrabold">Bộ lọc</h2>
      <FilterFields
        value={value}
        onChange={onChange}
        facets={facets}
        lockCategory={lockCategory}
      />
      <button
        type="button"
        onClick={onClear}
        className="w-full border border-border-soft px-3.5 py-2.5 text-left text-[13px] font-extrabold hover:bg-subtle"
      >
        XOÁ BỘ LỌC
      </button>
    </aside>
  );
}

export const SORT_ENTRIES = Object.entries(SORTS) as [SortKey, string][];

/** Ô sắp xếp của desktop; mobile dùng sheet nên ẩn đi. */
export function SortSelect({ value, onChange }: { value: SortKey; onChange: (v: string) => void }) {
  return (
    <select
      aria-label="Sắp xếp"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="hidden border border-border-soft bg-bg px-3.5 py-2.5 text-[13px] font-semibold lg:block"
    >
      {SORT_ENTRIES.map(([key, label]) => (
        <option key={key} value={key}>
          {label}
        </option>
      ))}
    </select>
  );
}
