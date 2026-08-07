import Link from "next/link";
import { Search, User, ShoppingBag } from "lucide-react";
import { db } from "@/lib/db";
import { IconButton } from "@/components/ui/button";

export async function SiteHeader() {
  const categories = await db.category.findMany({
    orderBy: { sort: "asc" },
    select: { name: true, slug: true },
  });

  return (
    <header className="border-b-2 border-divider bg-surface">
      <div className="flex h-9 items-center justify-between border-b border-hairline px-6 text-[12px] font-semibold uppercase tracking-[0.08em] text-neutral-600">
        <span>Miễn phí giao hàng cho đơn từ 500.000đ</span>
        <div className="flex items-center gap-5">
          <Link href="/tra-cuu-don" className="hover:text-accent-700">
            Tra cứu đơn
          </Link>
          <Link href="/ho-tro" className="hover:text-accent-700">
            Hỗ trợ
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-8 px-6 py-4">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="text-[22px] font-extrabold leading-none tracking-[-0.03em]">
            MEN STYLE HOUSE
          </span>
          <span className="h-2.5 w-2.5 bg-accent" aria-hidden />
        </Link>

        <nav className="flex flex-1 items-center gap-6 text-[14px] font-semibold">
          {categories.map((c) => (
            <Link
              key={c.slug}
              href={{ pathname: "/danh-muc/" + c.slug }}
              className="py-1 hover:text-accent-700"
            >
              {c.name}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          <IconButton aria-label="Tìm kiếm">
            <Search size={18} />
          </IconButton>
          <IconButton aria-label="Tài khoản">
            <User size={18} />
          </IconButton>
          <IconButton aria-label="Giỏ hàng">
            <ShoppingBag size={18} />
          </IconButton>
        </div>
      </div>
    </header>
  );
}
