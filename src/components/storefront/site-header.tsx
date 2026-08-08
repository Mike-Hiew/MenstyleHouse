"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Search, ShieldCheck, ShoppingBag, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { useOverlay } from "@/components/ui/overlay";
import { Container } from "./shell";

/**
 * Một cây DOM, gập theo breakpoint (`docs/RESPONSIVE.md`).
 * Desktop: logo + nav ngang + ô tìm + cụm tài khoản.
 * Mobile: hamburger → logo → tìm → giỏ; nav và danh mục vào drawer trượt trái.
 */

/*
 * "Giới thiệu" trỏ về trang chủ, đúng như mockup: `shopNav` của mockup ghi
 * `['Giới thiệu','home']`. Mockup **không có** màn giới thiệu riêng, và trang
 * chủ chính là phần giới thiệu cửa hàng — hero, danh mục, hàng bán chạy, lời
 * khách. Trước đây mục này trỏ vào `/gioi-thieu`, một trang chưa bao giờ tồn
 * tại: bấm vào là ra 404.
 */
const NAV = [
  { label: "Sản phẩm", href: "/san-pham" },
  { label: "Tra cứu đơn", href: "/tra-cuu-don" },
  { label: "Tài khoản", href: "/tai-khoan" },
  { label: "Giới thiệu", href: "/" },
];

const ACCOUNT = [
  { label: "Đăng nhập", href: "/dang-nhap" },
  { label: "Đăng ký", href: "/dang-ky" },
];

export type HeaderMember = { name: string; points: number };

export function SiteHeader({
  categories = [],
  cartCount = 0,
  member = null,
  staffRole = null,
}: {
  categories?: { name: string; slug: string }[];
  cartCount?: number;
  member?: HeaderMember | null;
  /**
   * Nhãn vai trò nếu người đang đăng nhập là nhân viên.
   *
   * Mockup không có lối này — thanh CỬA HÀNG/QUẢN TRỊ trong mockup là chrome
   * của chính bản prototype, không phải chức năng của cửa hàng. Nhưng đăng nhập
   * bằng tài khoản quản trị rồi phải tự gõ đường dẫn `/admin` thì vô lý.
   */
  staffRole?: string | null;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [searchOpen, setSearchOpen] = React.useState(false);

  // Điều hướng xong thì đóng drawer, nếu không nó che mất trang mới.
  React.useEffect(() => setMenuOpen(false), [pathname]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <header className="sticky top-0 z-70 bg-bg">
      <div className="border-b border-hairline">
        <Container className="py-1.5 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-muted lg:text-[12px]">
          Miễn phí giao từ 500.000 ₫
        </Container>
      </div>

      <div className="border-b-2 border-divider">
        <Container className="flex items-center gap-1 py-2 lg:gap-8 lg:py-4">
          <button
            type="button"
            aria-label="Mở menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
            className="-ml-2 flex h-11 w-11 items-center justify-center lg:hidden"
          >
            <Menu size={22} />
          </button>

          <Link href="/" className="flex min-h-11 min-w-0 items-center gap-2" aria-label="Về trang chủ">
            <span className="block h-[18px] w-[18px] flex-none bg-accent lg:h-[22px] lg:w-[22px]" aria-hidden />
            <span className="truncate text-[13.5px] font-extrabold uppercase tracking-[-0.03em] sm:text-[15px] lg:text-[18px]">
              Men Style House
            </span>
          </Link>

          <nav className="hidden gap-6 lg:flex">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={{ pathname: n.href }}
                className={cn(
                  "border-b-2 py-1 text-[13px] font-semibold uppercase tracking-[0.04em]",
                  isActive(n.href) ? "border-accent" : "border-transparent hover:border-hairline",
                )}
              >
                {n.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex flex-none items-center gap-0.5 lg:gap-3">
            <form
              action="/san-pham"
              method="get"
              role="search"
              className="hidden w-[220px] items-center gap-2 border border-border-soft bg-subtle px-3 py-2.5 lg:flex"
            >
              <Search size={14} className="flex-none text-faint" aria-hidden />
              <input
                name="q"
                type="search"
                aria-label="Tìm sản phẩm"
                placeholder="Tìm áo phông, jeans…"
                className="w-full border-0 bg-transparent text-[14px] outline-none"
              />
            </form>

            <button
              type="button"
              aria-label="Tìm sản phẩm"
              aria-expanded={searchOpen}
              onClick={() => setSearchOpen((v) => !v)}
              className="flex h-11 w-11 items-center justify-center lg:hidden"
            >
              <Search size={20} />
            </button>

            {staffRole ? (
              <Link
                href={{ pathname: "/admin" }}
                title={"Bạn đang đăng nhập với vai trò " + staffRole}
                className="hidden min-h-11 items-center gap-2 border-2 border-divider px-3.5 text-[12.5px] font-extrabold lg:flex"
              >
                <ShieldCheck size={15} aria-hidden />
                QUẢN TRỊ
              </Link>
            ) : null}

            {/* Member: ô vuông đen chữ tắt + tên + điểm, đúng mockup. */}
            {member ? (
              <Link
                href={{ pathname: "/tai-khoan" }}
                className="hidden items-center gap-2.5 border border-border-soft py-1.5 pl-1.5 pr-3 text-left lg:flex"
              >
                <span className="grid h-7 w-7 flex-none place-items-center bg-neutral-900 font-heading text-[11px] font-extrabold text-bg">
                  {initials(member.name)}
                </span>
                <span>
                  <span className="block text-[12.5px] font-bold">{member.name}</span>
                  <span className="block font-mono text-[10px] font-bold leading-[1.3] text-accent-600">
                    {member.points} điểm
                  </span>
                </span>
              </Link>
            ) : (
            <div className="hidden gap-2 lg:flex">
              {ACCOUNT.map((a, i) => (
                <Link
                  key={a.href}
                  href={{ pathname: a.href }}
                  className={cn(
                    "px-3.5 py-2.5 text-[13px]",
                    i === 0
                      ? "border border-border-soft font-semibold"
                      : "bg-neutral-900 font-extrabold text-bg",
                  )}
                >
                  {a.label}
                </Link>
              ))}
            </div>
            )}

            {/* Mobile: icon 44px kèm huy hiệu như mockup. Desktop: nút đỏ có chữ. */}
            <Link
              href={{ pathname: "/gio-hang" }}
              aria-label={"Giỏ hàng, " + cartCount + " sản phẩm"}
              className="relative flex h-11 w-11 items-center justify-center lg:h-11 lg:w-auto lg:bg-accent lg:px-4 lg:text-[13px] lg:font-extrabold lg:tracking-[0.02em] lg:text-bg"
            >
              <ShoppingBag size={20} className="lg:hidden" aria-hidden />
              {cartCount > 0 ? (
                <span className="absolute right-0.5 top-1 min-w-[16px] bg-accent px-1 text-center font-mono text-[10px] font-bold leading-4 text-bg lg:hidden">
                  {cartCount}
                </span>
              ) : null}
              <span className="hidden lg:inline">GIỎ ({cartCount})</span>
            </Link>
          </div>
        </Container>

        {/* Ô tìm mobile mở thành hàng riêng để không bóp logo. */}
        {searchOpen ? (
          <Container className="pb-3 lg:hidden">
            <form action="/san-pham" method="get" role="search" className="flex gap-2">
              <input
                name="q"
                type="search"
                autoFocus
                aria-label="Tìm sản phẩm"
                placeholder="Tìm áo phông, jeans…"
                className="h-12 w-full border border-border-soft bg-subtle px-3 text-[16px] outline-none"
              />
              <button
                type="submit"
                className="h-12 flex-none bg-neutral-900 px-4 text-[14px] font-extrabold text-bg"
              >
                Tìm
              </button>
            </form>
          </Container>
        ) : null}
      </div>

      <NavDrawer
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        categories={categories}
        isActive={isActive}
        staffRole={staffRole}
      />
    </header>
  );
}

function NavDrawer({
  open,
  onClose,
  categories,
  isActive,
  staffRole,
}: {
  open: boolean;
  onClose: () => void;
  categories: { name: string; slug: string }[];
  isActive: (href: string) => boolean;
  staffRole: string | null;
}) {
  const panelRef = useOverlay(open, onClose);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-80 flex bg-neutral-900/55 lg:hidden"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        className="flex h-full w-[86%] max-w-[340px] flex-col border-r-2 border-divider bg-bg"
      >
        <div className="flex flex-none items-center justify-between border-b-2 border-divider px-4 py-3">
          <span className="text-[15px] font-extrabold uppercase tracking-[-0.03em]">
            Men Style House
          </span>
          <button
            type="button"
            aria-label="Đóng menu"
            onClick={onClose}
            className="-mr-2 flex h-11 w-11 items-center justify-center"
          >
            <X size={22} />
          </button>
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto">
          {/* Lối vào quản trị đứng đầu drawer — nhân viên dùng điện thoại cũng
              không phải gõ đường dẫn. */}
          {staffRole ? (
            <Link
              href={{ pathname: "/admin" }}
              onClick={onClose}
              className="flex min-h-[52px] items-center gap-2.5 border-b-2 border-divider bg-subtle px-4 text-[14px] font-extrabold"
            >
              <ShieldCheck size={17} aria-hidden />
              KHU QUẢN TRỊ
              <span className="ml-auto text-[12px] font-semibold text-muted">{staffRole}</span>
            </Link>
          ) : null}

          {NAV.map((n) => (
            <Link
              key={n.href}
              href={{ pathname: n.href }}
              className={cn(
                "flex min-h-12 items-center border-b border-hairline px-4 text-[15px] font-semibold",
                isActive(n.href) && "text-accent-700",
              )}
            >
              {n.label}
            </Link>
          ))}

          {categories.length > 0 ? (
            <>
              <div className="label-tech border-b border-hairline px-4 py-3 font-bold">
                DANH MỤC
              </div>
              {categories.map((c) => (
                <Link
                  key={c.slug}
                  href={{ pathname: "/danh-muc/" + c.slug }}
                  className="flex min-h-12 items-center border-b border-hairline px-4 text-[15px]"
                >
                  {c.name}
                </Link>
              ))}
            </>
          ) : null}
        </nav>

        <div className="flex flex-none gap-2 border-t-2 border-divider p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {ACCOUNT.map((a, i) => (
            <Link
              key={a.href}
              href={{ pathname: a.href }}
              className={cn(
                "flex h-12 flex-1 items-center justify-center text-[14px]",
                i === 0
                  ? "border border-border-soft font-semibold"
                  : "bg-neutral-900 font-extrabold text-bg",
              )}
            >
              {a.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Chữ tắt hai ký tự cho ô avatar — mockup dùng "MA". */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const last = parts[parts.length - 1] ?? "";
  const first = parts[0] ?? "";
  return ((first[0] ?? "") + (last[0] ?? "")).toUpperCase() || "MSH";
}
