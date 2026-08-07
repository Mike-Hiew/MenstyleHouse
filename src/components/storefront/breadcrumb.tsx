import Link from "next/link";
import { ChevronRight } from "lucide-react";

export type Crumb = { label: string; href?: string };

export function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Đường dẫn" className="border-b border-hairline bg-surface px-6 py-2.5">
      <ol className="flex flex-wrap items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.06em] text-neutral-500">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-1.5">
            {i > 0 ? <ChevronRight size={13} className="text-neutral-400" aria-hidden /> : null}
            {item.href ? (
              <Link href={{ pathname: item.href }} className="hover:text-accent-700">
                {item.label}
              </Link>
            ) : (
              <span className="text-text" aria-current="page">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
