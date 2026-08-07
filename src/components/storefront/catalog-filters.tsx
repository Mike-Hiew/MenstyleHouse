"use client";

import * as React from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Checkbox, Select } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { SORTS, type Facets, type SortKey } from "@/lib/catalog";
import { clearFilters, qs, readList, setValue, toggleValue } from "@/lib/search-params";

/**
 * Bộ lọc điều khiển bằng URL: mọi thao tác đẩy một query string mới rồi để
 * server tính lại. Không giữ trạng thái lọc ở client nên chia sẻ link là đủ.
 */

type Shared = {
  basePath: string;
  /** Query string hiện tại, không có dấu `?`. */
  params: string;
  facets: Facets;
  /** Trang /danh-muc/[slug] khoá danh mục nên ẩn nhóm lọc danh mục. */
  lockCategory?: boolean;
};

function useNavigate(basePath: string, params: string) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  const go = React.useCallback(
    (next: URLSearchParams) => {
      startTransition(() => {
        router.push((basePath + qs(next)) as Route, { scroll: false });
      });
    },
    [basePath, router],
  );

  const current = React.useCallback(() => new URLSearchParams(params), [params]);

  return { go, current, pending };
}

/* ── Một nhóm lọc ─────────────────────────────────────────── */

function FacetGroup({
  title,
  paramKey,
  options,
  selected,
  onToggle,
}: {
  title: string;
  paramKey: string;
  options: Facets["colors"];
  selected: string[];
  onToggle: (key: string, value: string) => void;
}) {
  if (options.length === 0) return null;

  return (
    <fieldset className="border-b border-hairline px-5 py-4 last:border-b-0">
      <legend className="mb-2.5 text-[12px] font-bold uppercase tracking-[0.08em] text-neutral-600">
        {title}
      </legend>
      <div className="flex flex-col gap-2">
        {options.map((o) => {
          const checked = selected.includes(o.value);
          const off = o.count === 0 && !checked;
          return (
            <Checkbox
              key={o.value}
              checked={checked}
              disabled={off}
              onChange={() => onToggle(paramKey, o.value)}
              label={
                <span className={cn("flex flex-1 items-center gap-2", off && "text-neutral-400")}>
                  {o.hex ? (
                    <span
                      className="h-3.5 w-3.5 shrink-0 border border-hairline"
                      style={{ background: o.hex }}
                      aria-hidden
                    />
                  ) : null}
                  <span className="flex-1">{o.label}</span>
                  <span className="font-mono text-[12px] text-neutral-500">{o.count}</span>
                </span>
              }
            />
          );
        })}
      </div>
    </fieldset>
  );
}

/* ── Bảng lọc dùng chung cho sidebar và dialog ─────────────── */

function FilterPanel({ basePath, params, facets, lockCategory }: Shared) {
  const { go, current } = useNavigate(basePath, params);
  const sp = current();

  const onToggle = (key: string, value: string) => go(toggleValue(sp, key, value));

  return (
    <div>
      {lockCategory ? null : (
        <FacetGroup
          title="Danh mục"
          paramKey="danh-muc"
          options={facets.categories}
          selected={readList(sp, "danh-muc")}
          onToggle={onToggle}
        />
      )}

      <FacetGroup
        title="Khoảng giá"
        paramKey="gia"
        options={facets.prices}
        selected={readList(sp, "gia")}
        onToggle={onToggle}
      />

      <FacetGroup
        title="Màu sắc"
        paramKey="mau"
        options={facets.colors}
        selected={readList(sp, "mau")}
        onToggle={onToggle}
      />

      <FacetGroup
        title="Kích cỡ"
        paramKey="size"
        options={facets.sizes}
        selected={readList(sp, "size")}
        onToggle={onToggle}
      />

      <FacetGroup
        title="Thương hiệu"
        paramKey="thuong-hieu"
        options={facets.brands}
        selected={readList(sp, "thuong-hieu")}
        onToggle={onToggle}
      />

      <fieldset className="border-b border-hairline px-5 py-4 last:border-b-0">
        <legend className="mb-2.5 text-[12px] font-bold uppercase tracking-[0.08em] text-neutral-600">
          Khuyến mãi
        </legend>
        <Checkbox
          checked={sp.get("km") === "1"}
          disabled={facets.sale === 0 && sp.get("km") !== "1"}
          onChange={() => go(setValue(sp, "km", sp.get("km") === "1" ? null : "1"))}
          label={
            <span className="flex flex-1 items-center gap-2">
              <span className="flex-1">Đang giảm giá</span>
              <span className="font-mono text-[12px] text-neutral-500">{facets.sale}</span>
            </span>
          }
        />
      </fieldset>
    </div>
  );
}

export function FilterSidebar(props: Shared) {
  return (
    <aside
      aria-label="Bộ lọc sản phẩm"
      className="hidden w-64 shrink-0 self-start border-2 border-divider bg-surface lg:block"
    >
      <h2 className="border-b-2 border-divider px-5 py-3 text-[13px] font-extrabold uppercase tracking-[0.08em]">
        Bộ lọc
      </h2>
      <FilterPanel {...props} />
    </aside>
  );
}

/** Trên màn hẹp bộ lọc nằm trong dialog — dialog đã bẫy focus và đóng bằng Esc. */
export function FilterDialogButton({ activeCount, ...props }: Shared & { activeCount: number }) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="lg:hidden">
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <SlidersHorizontal size={15} />
        Bộ lọc
        {activeCount > 0 ? (
          <span className="ml-1 bg-accent px-1.5 py-0.5 font-mono text-[11px] text-white">
            {activeCount}
          </span>
        ) : null}
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)} title="Bộ lọc" width={420}>
        <div className="-mx-5 -my-5">
          <FilterPanel {...props} />
        </div>
      </Dialog>
    </div>
  );
}

export function SortSelect({ basePath, params }: Pick<Shared, "basePath" | "params">) {
  const { go, current } = useNavigate(basePath, params);
  const sp = current();
  const value = (sp.get("sap-xep") ?? "moi-nhat") as SortKey;

  return (
    <label className="flex items-center gap-2 text-[13px] font-semibold text-neutral-600">
      <span className="whitespace-nowrap uppercase tracking-[0.08em]">Sắp xếp</span>
      <Select
        className="h-9 w-48 text-[13px]"
        value={value}
        onChange={(e) => go(setValue(sp, "sap-xep", e.target.value))}
      >
        {Object.entries(SORTS).map(([key, label]) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </Select>
    </label>
  );
}

/* ── Thẻ bộ lọc đang bật ──────────────────────────────────── */

const CHIP_GROUPS: { key: string; prefix: string }[] = [
  { key: "danh-muc", prefix: "" },
  { key: "gia", prefix: "" },
  { key: "mau", prefix: "Màu " },
  { key: "size", prefix: "Size " },
  { key: "thuong-hieu", prefix: "" },
];

export function ActiveFilterChips({
  basePath,
  params,
  facets,
  lockCategory,
}: Shared) {
  const { go, current } = useNavigate(basePath, params);
  const sp = current();

  const labelFor = (key: string, value: string) => {
    const pool =
      key === "danh-muc"
        ? facets.categories
        : key === "gia"
          ? facets.prices
          : key === "mau"
            ? facets.colors
            : key === "size"
              ? facets.sizes
              : facets.brands;
    return pool.find((o) => o.value === value)?.label ?? value;
  };

  const chips: { key: string; value: string; text: string }[] = [];
  for (const g of CHIP_GROUPS) {
    if (lockCategory && g.key === "danh-muc") continue;
    for (const v of readList(sp, g.key)) {
      chips.push({ key: g.key, value: v, text: g.prefix + labelFor(g.key, v) });
    }
  }
  if (sp.get("km") === "1") chips.push({ key: "km", value: "1", text: "Đang giảm giá" });

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 pb-4">
      {chips.map((c) => (
        <button
          key={c.key + c.value}
          onClick={() =>
            go(c.key === "km" ? setValue(sp, "km", null) : toggleValue(sp, c.key, c.value))
          }
          className="inline-flex items-center gap-1.5 border-2 border-divider px-2.5 py-1 text-[12px] font-semibold hover:bg-neutral-200"
        >
          {c.text}
          <X size={13} aria-hidden />
          <span className="sr-only">Bỏ lọc</span>
        </button>
      ))}

      <button
        onClick={() => go(clearFilters(sp))}
        className="px-1 text-[12px] font-bold uppercase tracking-[0.08em] text-accent-700 hover:underline"
      >
        Xoá tất cả
      </button>
    </div>
  );
}
