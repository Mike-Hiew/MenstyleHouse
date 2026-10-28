"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Search, ShieldCheck, ShoppingBag, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { useOverlay } from "@/components/ui/overlay";
import { AccountMenu, chuTat, type ThanhVien } from "./account-menu";
import { logoutAction } from "@/app/(tai-khoan)/actions";
import { Container } from "./shell";
import { useCartDrawer } from "./cart-drawer";

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

export type HeaderMember = ThanhVien;

/** Huy hiệu nảy khi vừa thêm hàng — chỉ sau lần thêm đầu, không phải mỗi lần tải trang. */
const BUMP = "motion-safe:animate-[bump_.55s_var(--ease-out-soft)]";

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
  const drawer = useCartDrawer();
  // Đang ở trang giỏ hoặc thanh toán thì nút giỏ vẫn chỉ là link, mở thêm
  // ngăn kéo đè lên đúng nội dung ấy chỉ tổ rối.
  const drawerHere = drawer && !/^\/(gio-hang|thanh-toan)(\/|$)/.test(pathname);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [searchOpen, setSearchOpen] = React.useState(false);

  // Điều hướng xong thì đóng drawer, nếu không nó che mất trang mới.
  React.useEffect(() => setMenuOpen(false), [pathname]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <header className="sticky top-0 z-70 bg-bg/85 backdrop-blur-xl">
      <div className="bg-sand/70">
        <Container className="py-1.5 text-center text-[11.5px] font-semibold text-muted lg:text-[12.5px]">
          Miễn phí giao từ 500.000 ₫
        </Container>
      </div>

      <div className="shadow-[0_1px_0_rgba(21,20,19,0.05)]">
        <Container className="flex items-center gap-1 py-2 lg:gap-8 lg:py-3">
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
            <span className="block h-[14px] w-[14px] flex-none rounded-[4px] bg-accent lg:h-[16px] lg:w-[16px]" aria-hidden />
            <span className="truncate text-[13.5px] font-extrabold uppercase tracking-[-0.03em] sm:text-[15px] lg:text-[18px]">
              Men Style House
            </span>
          </Link>

          <nav className="hidden gap-1 lg:flex">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={{ pathname: n.href }}
                className={cn(
                  "rounded-full px-3.5 py-2 text-[13.5px] font-medium transition-colors",
                  isActive(n.href) ? "bg-field font-semibold" : "hover:bg-field",
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
              className="hidden w-[220px] items-center gap-2 px-3 py-2.5 lg:flex rounded-full bg-field"
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
                className="hidden min-h-11 items-center gap-2 px-3.5 text-[12.5px] font-extrabold lg:flex rounded-full bg-field hover:bg-field-hover"
              >
                <ShieldCheck size={15} aria-hidden />
                QUẢN TRỊ
              </Link>
            ) : null}

            {/* Member: ô vuông đen chữ tắt + tên + điểm (mockup), bấm vào xổ
                xuống điểm/hạng và nút đăng xuất. */}
            {member ? (
              <AccountMenu ban={member} vaiTro={staffRole} />
            ) : (
            <div className="hidden gap-2 lg:flex">
              {ACCOUNT.map((a, i) => (
                <Link
                  key={a.href}
                  href={{ pathname: a.href }}
                  className={cn(
                    "rounded-full px-4 py-2.5 text-[13px] font-semibold",
                    i === 0 ? "bg-field hover:bg-field-hover" : "bg-neutral-900 text-bg",
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
              data-cart-target
              aria-label={"Giỏ hàng, " + cartCount + " sản phẩm"}
              aria-haspopup={drawerHere ? "dialog" : undefined}
              onClick={(e) => {
                // Ctrl/⌘/Shift-click vẫn mở trang giỏ ở tab mới như link thường.
                if (!drawerHere || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
                e.preventDefault();
                drawer.open();
              }}
              className="relative flex h-11 w-11 items-center justify-center rounded-full lg:h-11 lg:w-auto lg:gap-2 lg:bg-neutral-900 lg:pl-4 lg:pr-2 lg:text-[13.5px] lg:font-semibold lg:text-bg"
            >
              <ShoppingBag size={20} className="lg:hidden" aria-hidden />
              {cartCount > 0 ? (
                <span
                  key={"m" + (drawer?.bump ?? 0)}
                  className={cn(
                    "absolute right-0.5 top-1 min-w-[17px] rounded-full bg-accent px-1 text-center text-[10px] font-bold leading-[17px] text-bg lg:hidden",
                    drawer?.bump && BUMP,
                  )}
                >
                  {cartCount}
                </span>
              ) : null}
              <span className="hidden lg:inline">Giỏ</span>
              <span
                key={"d" + (drawer?.bump ?? 0)}
                className={cn(
                  "hidden h-[26px] min-w-[26px] place-items-center rounded-full bg-accent px-1.5 text-[12px] lg:grid",
                  drawer?.bump && BUMP,
                )}
              >
                {cartCount}
              </span>
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
                className="h-12 w-full px-3 text-[16px] outline-none rounded-full bg-field"
              />
              <button
                type="submit"
                className="h-12 flex-none rounded-full bg-neutral-900 px-5 text-[14px] font-semibold text-bg"
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
        member={member}
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
  member,
}: {
  open: boolean;
  onClose: () => void;
  categories: { name: string; slug: string }[];
  isActive: (href: string) => boolean;
  staffRole: string | null;
  member: HeaderMember | null;
}) {
  const panelRef = useOverlay(open, onClose);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-80 flex bg-scrim backdrop-blur-[var(--scrim-blur)] lg:hidden"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        className="m-2.5 flex w-[86%] max-w-[340px] flex-col overflow-hidden rounded-[28px] bg-bg shadow-raised"
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
              className="mx-3 mb-2 flex min-h-[52px] items-center gap-2.5 rounded-2xl bg-field px-4 text-[14px] font-extrabold"
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
                isActive(n.href) && "bg-field",
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

        {/*
          Đã đăng nhập thì đáy drawer là thông tin tài khoản + đăng xuất. Bản
          trước luôn hiện "Đăng nhập / Đăng ký" kể cả khi đang đăng nhập, nên
          trên điện thoại không có đường nào đăng xuất ngoài việc vào hẳn trang
          tài khoản.
        */}
        {member ? (
          <div className="flex-none border-t-2 border-divider pb-[max(0.5rem,env(safe-area-inset-bottom))]">
            <Link
              href={"/tai-khoan" as const}
              onClick={onClose}
              className="m-3 flex items-center gap-3 rounded-2xl bg-neutral-900 p-4 text-bg"
            >
              <span className="grid h-9 w-9 flex-none place-items-center rounded-full bg-bg font-heading text-[12px] font-extrabold text-text">
                {chuTat(member.name)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-extrabold">{member.name}</span>
                <span className="block text-[11.5px] font-semibold text-neutral-400">
                  {member.points} điểm{member.hang ? " · HẠNG " + member.hang : ""}
                </span>
              </span>
            </Link>
            <form action={logoutAction}>
              <button
                type="submit"
                className="flex min-h-12 w-full items-center px-4 text-left text-[14px] font-semibold"
              >
                Đăng xuất
              </button>
            </form>
          </div>
        ) : (
          <div className="flex flex-none gap-2 border-t-2 border-divider p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            {ACCOUNT.map((a, i) => (
              <Link
                key={a.href}
                href={{ pathname: a.href }}
                className={cn(
                  "flex h-12 flex-1 items-center justify-center rounded-full text-[14px] font-semibold",
                  i === 0 ? "bg-field" : "bg-neutral-900 text-bg",
                )}
              >
                {a.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

