/** Khung xám khi trang đang tải dữ liệu — giữ đúng bố cục để không nhảy layout. */
export function CatalogSkeleton() {
  return (
    <div className="px-6 py-8" aria-busy="true" aria-live="polite">
      <span className="sr-only">Đang tải sản phẩm…</span>

      <div className="mb-6 border-b-2 border-divider pb-4">
        <div className="h-9 w-64 animate-pulse bg-neutral-200" />
      </div>

      <div className="flex gap-8">
        <div className="hidden w-64 shrink-0 border-2 border-divider bg-surface lg:block">
          <div className="border-b-2 border-divider px-5 py-3">
            <div className="h-4 w-20 animate-pulse bg-neutral-200" />
          </div>
          {[0, 1, 2, 3].map((g) => (
            <div key={g} className="flex flex-col gap-2.5 border-b border-hairline px-5 py-4">
              <div className="h-3 w-24 animate-pulse bg-neutral-200" />
              {[0, 1, 2].map((r) => (
                <div key={r} className="h-4 w-full animate-pulse bg-neutral-200" />
              ))}
            </div>
          ))}
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-4 h-9 border-b border-hairline pb-3">
            <div className="h-4 w-28 animate-pulse bg-neutral-200" />
          </div>
          <div className="grid grid-cols-2 gap-px bg-divider md:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="bg-surface p-4">
                <div className="mb-3 aspect-[3/4] animate-pulse bg-neutral-200" />
                <div className="mb-2 h-3 w-16 animate-pulse bg-neutral-200" />
                <div className="mb-2 h-4 w-full animate-pulse bg-neutral-200" />
                <div className="h-4 w-24 animate-pulse bg-neutral-200" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
