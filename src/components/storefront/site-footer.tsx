import Link from "next/link";
import { getNavCategories } from "@/server/navigation";

const HELP = [
  { label: "Tra cứu đơn", href: "/tra-cuu-don" },
  { label: "Hỗ trợ", href: "/ho-tro" },
  { label: "Chính sách đổi trả", href: "/ho-tro" },
  { label: "Hướng dẫn chọn size", href: "/san-pham" },
];

export async function SiteFooter() {
  const categories = await getNavCategories();

  return (
    <footer className="mt-auto border-t-2 border-divider bg-surface">
      <div className="grid grid-cols-1 gap-px bg-divider md:grid-cols-4">
        <div className="bg-surface px-6 py-8">
          <div className="mb-3 flex items-baseline gap-2">
            <span className="text-[17px] font-extrabold tracking-[-0.03em]">MEN STYLE HOUSE</span>
            <span className="h-2 w-2 bg-accent" aria-hidden />
          </div>
          <p className="max-w-xs text-[13px] text-neutral-600">
            Quần áo nam đúng dáng, đúng giá. Chất liệu thật, số đo thật, đổi trả
            trong 15 ngày.
          </p>
        </div>

        <nav className="bg-surface px-6 py-8" aria-label="Danh mục">
          <h2 className="mb-3 text-[12px] font-bold uppercase tracking-[0.08em] text-neutral-500">
            Danh mục
          </h2>
          <ul className="flex flex-col gap-1.5 text-[13px]">
            {categories.map((c) => (
              <li key={c.slug}>
                <Link href={{ pathname: "/danh-muc/" + c.slug }} className="hover:text-accent-700">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav className="bg-surface px-6 py-8" aria-label="Hỗ trợ khách hàng">
          <h2 className="mb-3 text-[12px] font-bold uppercase tracking-[0.08em] text-neutral-500">
            Hỗ trợ
          </h2>
          <ul className="flex flex-col gap-1.5 text-[13px]">
            {HELP.map((h) => (
              <li key={h.label}>
                <Link href={{ pathname: h.href }} className="hover:text-accent-700">
                  {h.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="bg-surface px-6 py-8">
          <h2 className="mb-3 text-[12px] font-bold uppercase tracking-[0.08em] text-neutral-500">
            Liên hệ
          </h2>
          <ul className="flex flex-col gap-1.5 text-[13px] text-neutral-600">
            <li className="font-mono">1900 6789</li>
            <li className="font-mono">hotro@menstylehouse.vn</li>
            <li>8:00 – 21:00, tất cả các ngày</li>
          </ul>
        </div>
      </div>

      <div className="border-t-2 border-divider px-6 py-4 text-[12px] text-neutral-500">
        © 2026 Men Style House. Giá đã bao gồm VAT.
      </div>
    </footer>
  );
}
