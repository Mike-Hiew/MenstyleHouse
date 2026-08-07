import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { setPage } from "@/lib/search-params";

/** Dãy trang rút gọn: luôn có trang đầu, trang cuối và hai trang quanh hiện tại. */
function pageList(page: number, pages: number): (number | "…")[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const set = new Set([1, pages, page, page - 1, page + 1]);
  const nums = [...set].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  for (let i = 0; i < nums.length; i++) {
    if (i > 0 && nums[i] - nums[i - 1] > 1) out.push("…");
    out.push(nums[i]);
  }
  return out;
}

export function Pagination({
  page,
  pages,
  basePath,
  params,
}: {
  page: number;
  pages: number;
  basePath: string;
  params: URLSearchParams;
}) {
  if (pages <= 1) return null;

  const href = (n: number) => ({ pathname: basePath, query: setPage(params, n).toString() });
  const cell =
    "flex h-10 min-w-10 items-center justify-center border-2 border-divider px-3 text-[14px] font-semibold";

  return (
    <nav aria-label="Phân trang" className="flex items-center justify-center gap-2 py-10">
      {page > 1 ? (
        <Link href={href(page - 1)} className={cn(cell, "hover:bg-neutral-200")} rel="prev">
          <ChevronLeft size={16} aria-hidden />
          <span className="sr-only">Trang trước</span>
        </Link>
      ) : (
        <span className={cn(cell, "opacity-40")} aria-hidden>
          <ChevronLeft size={16} />
        </span>
      )}

      {pageList(page, pages).map((n, i) =>
        n === "…" ? (
          <span key={"gap" + i} className="px-1 text-neutral-400">
            …
          </span>
        ) : n === page ? (
          <span key={n} className={cn(cell, "bg-accent border-accent text-white")} aria-current="page">
            {n}
          </span>
        ) : (
          <Link key={n} href={href(n)} className={cn(cell, "hover:bg-neutral-200")}>
            {n}
          </Link>
        ),
      )}

      {page < pages ? (
        <Link href={href(page + 1)} className={cn(cell, "hover:bg-neutral-200")} rel="next">
          <span className="sr-only">Trang sau</span>
          <ChevronRight size={16} aria-hidden />
        </Link>
      ) : (
        <span className={cn(cell, "opacity-40")} aria-hidden>
          <ChevronRight size={16} />
        </span>
      )}
    </nav>
  );
}
