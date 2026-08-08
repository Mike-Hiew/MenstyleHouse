import { Container } from "./shell";

/** Khung xám khi trang đang tải dữ liệu — giữ đúng bố cục để không nhảy layout. */
export function CatalogSkeleton() {
  return (
    <Container className="pb-16 pt-6" aria-busy="true">
      <span className="sr-only">Đang tải sản phẩm…</span>

      <div className="mb-5 h-3 w-40 animate-pulse bg-subtle" />

      <div className="grid items-start gap-8 lg:grid-cols-[240px_1fr]">
        <div className="border-t-2 border-divider pt-4">
          <div className="mb-4 h-5 w-20 animate-pulse bg-subtle" />
          {[0, 1, 2].map((g) => (
            <div key={g} className="mb-6 flex flex-col gap-2.5">
              <div className="h-3 w-24 animate-pulse bg-subtle" />
              {[0, 1, 2, 3].map((r) => (
                <div key={r} className="h-6 w-full animate-pulse bg-subtle" />
              ))}
            </div>
          ))}
        </div>

        <div className="min-w-0">
          <div className="mb-6 border-b-2 border-divider pb-3.5">
            <div className="h-9 w-64 animate-pulse bg-subtle" />
            <div className="mt-1.5 h-4 w-28 animate-pulse bg-subtle" />
          </div>
          <div className="grid grid-cols-2 gap-6 md:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i}>
                <div className="aspect-[3/4] w-full animate-pulse bg-subtle" />
                <div className="mt-3 h-3 w-16 animate-pulse bg-subtle" />
                <div className="my-2 h-4 w-full animate-pulse bg-subtle" />
                <div className="h-4 w-24 animate-pulse bg-subtle" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </Container>
  );
}
