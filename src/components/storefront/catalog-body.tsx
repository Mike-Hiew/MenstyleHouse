"use client";

import * as React from "react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SlidersHorizontal, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/cn";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { PAGE_STEP, type Facets, type SortKey } from "@/lib/catalog";
import { clearFilters, qs, setShown, setValue } from "@/lib/search-params";
import { FilterFields, FilterSidebar, SORT_ENTRIES, SortSelect } from "./catalog-filters";
import { GridDensityToggle, ProductGrid, useGridDensity } from "./product-card";
import type { ProductCardData } from "@/server/catalog";

/**
 * Phần tương tác của trang danh sách. Server đã tính sẵn kết quả; ở đây chỉ lo
 * điều hướng URL, mật độ lưới và hai sheet của mobile.
 */
export function CatalogBody({
  basePath,
  params,
  facets,
  lockCategory,
  items,
  total,
  remaining,
  shown,
  title,
  resultText,
  empty,
}: {
  basePath: string;
  /** Query string hiện tại, không có dấu `?`. */
  params: string;
  facets: Facets;
  lockCategory?: boolean;
  items: ProductCardData[];
  total: number;
  remaining: number;
  shown: number;
  title: string;
  resultText: string;
  /** Trạng thái rỗng dựng ở server để giữ nguyên văn phong tiếng Việt. */
  empty: React.ReactNode;
}) {
  const router = useRouter();
  const [, startTransition] = React.useTransition();
  const [density, setDensity] = useGridDensity();
  const [sheet, setSheet] = React.useState<"loc" | "sap-xep" | null>(null);

  const current = React.useMemo(() => new URLSearchParams(params), [params]);

  const go = React.useCallback(
    (next: URLSearchParams) => {
      startTransition(() => router.push((basePath + qs(next)) as Route, { scroll: false }));
    },
    [basePath, router],
  );

  // Bản nháp của sheet lọc: mobile chỉ áp khi bấm "Áp dụng".
  const [draft, setDraft] = React.useState(current);
  React.useEffect(() => setDraft(current), [current]);

  const openFilter = () => {
    setDraft(new URLSearchParams(current));
    setSheet("loc");
  };

  const applyDraft = () => {
    setSheet(null);
    go(draft);
  };

  const sort = (current.get("sap-xep") ?? "moi-nhat") as SortKey;
  const activeCount = countActive(current);

  return (
    <>
      <div className="grid items-start gap-8 lg:grid-cols-[240px_1fr]">
        <FilterSidebar
          value={current}
          onChange={go}
          facets={facets}
          lockCategory={lockCategory}
          onClear={() => go(clearFilters(current))}
        />

        <div className="min-w-0">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b-2 border-divider pb-3.5">
            <div>
              <h1 className="text-[26px] leading-tight lg:text-[36px]">{title}</h1>
              <p className="mt-1.5 text-[13px] text-muted">{resultText}</p>
            </div>
            <div className="flex items-center gap-2">
              <GridDensityToggle value={density} onChange={setDensity} />
              <SortSelect value={sort} onChange={(v) => go(setValue(current, "sap-xep", v))} />
            </div>
          </div>

          {items.length > 0 ? (
            <>
              <ProductGrid products={items} density={density} />

              {remaining > 0 ? (
                <Link
                  href={{ pathname: basePath, query: setShown(current, shown + PAGE_STEP).toString() }}
                  className="mt-8 flex min-h-12 w-full items-center border border-border-soft pl-5 text-[14px] font-extrabold hover:bg-subtle"
                >
                  TẢI THÊM SẢN PHẨM (còn {remaining})
                </Link>
              ) : null}
            </>
          ) : (
            empty
          )}
        </div>
      </div>

      {/* Thanh hành động dính đáy — chỉ mobile. */}
      <div className="sticky bottom-0 z-40 -mx-4 mt-8 flex gap-2 border-t-2 border-divider bg-bg p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
        <button
          type="button"
          onClick={openFilter}
          className="flex h-[50px] flex-1 items-center justify-center gap-2 bg-accent text-[14px] font-extrabold text-bg"
        >
          <SlidersHorizontal size={16} aria-hidden />
          Lọc
          {activeCount > 0 ? (
            <span className="bg-bg px-1.5 py-0.5 font-mono text-[12px] text-text">{activeCount}</span>
          ) : null}
        </button>
        <button
          type="button"
          onClick={() => setSheet("sap-xep")}
          className="flex h-[50px] flex-1 items-center justify-center gap-2 border border-divider text-[14px] font-extrabold"
        >
          <ArrowUpDown size={16} aria-hidden />
          Sắp xếp
        </button>
      </div>

      <BottomSheet
        open={sheet === "loc"}
        onClose={() => setSheet(null)}
        title="Lọc sản phẩm"
        footer={
          <>
            <button
              type="button"
              onClick={() => setDraft(clearFilters(draft))}
              className="h-12 flex-1 border border-border-soft text-[14px] font-extrabold"
            >
              Xoá lọc
            </button>
            <button
              type="button"
              onClick={applyDraft}
              className="h-12 flex-[2] bg-accent text-[14px] font-extrabold text-bg"
            >
              Áp dụng
            </button>
          </>
        }
      >
        <div className="py-4">
          <FilterFields
            value={draft}
            onChange={setDraft}
            facets={facets}
            lockCategory={lockCategory}
          />
        </div>
      </BottomSheet>

      <BottomSheet
        open={sheet === "sap-xep"}
        onClose={() => setSheet(null)}
        title="Sắp xếp"
        maxHeight="60vh"
      >
        <div className="py-2">
          {SORT_ENTRIES.map(([key, label]) => (
            <button
              key={key}
              type="button"
              aria-pressed={sort === key}
              onClick={() => {
                setSheet(null);
                go(setValue(current, "sap-xep", key));
              }}
              className={cn(
                "flex min-h-12 w-full items-center border-b border-hairline text-left text-[15px]",
                sort === key ? "font-extrabold text-accent-700" : "font-normal",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </BottomSheet>

      <span className="sr-only" aria-live="polite">
        {total} sản phẩm khớp bộ lọc
      </span>
    </>
  );
}

/** Số lựa chọn đang bật, để gắn huy hiệu lên nút Lọc. */
function countActive(sp: URLSearchParams): number {
  const listLen = (k: string) => (sp.get(k) ?? "").split(",").filter(Boolean).length;
  return (
    listLen("danh-muc") +
    listLen("size") +
    listLen("mau") +
    listLen("thuong-hieu") +
    (sp.get("gia-tu") || sp.get("gia-den") ? 1 : 0) +
    (sp.get("km") === "1" ? 1 : 0)
  );
}
