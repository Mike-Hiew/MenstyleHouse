"use client";

import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Boxes,
  FolderTree,
  LayoutDashboard,
  LifeBuoy,
  Menu,
  PackagePlus,
  PanelLeftClose,
  PanelLeftOpen,
  ReceiptText,
  Ruler,
  Search,
  Settings,
  Shirt,
  ShieldCheck,
  ShoppingBag,
  TicketPercent,
  Users,
  Warehouse,
  X,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { FLAGS } from "@/lib/flags";
import { useOverlay } from "@/components/ui/overlay";
import { gomNhom, type AdminNavItem, type IconKey } from "./admin-nav";
import { AdminAccountMenu } from "./admin-account-menu";
import { AlertBell, type Viec } from "./alert-bell";

/**
 * Khung quản trị theo mockup: sidebar đen thu gọn được, header dính trên có
 * breadcrumb mono, ô tìm, chuông và khối người dùng.
 *
 * Dưới `lg:` sidebar thành drawer trượt trái — cùng một cây DOM, gập bằng CSS
 * đúng `docs/RESPONSIVE.md`.
 */

const SIDEBAR_KEY = "msh:admin-sidebar";

/** Kiểu "Modernist Glass" (cờ `adminGlass`); tắt thì về Modernist đen trắng. */
const GLASS = FLAGS.adminGlass;

/**
 * Khoá icon → component. Tra ở phía client vì component không đi qua được ranh
 * giới server/client.
 *
 * Thu gọn thì thanh bên chỉ còn cột icon này, nên mỗi icon phải **tự nói được
 * nó là mục nào**. Bản trước để chấm vuông xám giống hệt nhau cho cả 13 mục:
 * bấm vẫn đúng, nhưng nhìn thì không tài nào biết mục nào là mục nào, và thu
 * gọn hoá ra chỉ tổ làm mất đường.
 */
const ICON: Record<IconKey, React.ComponentType<{ size?: number; className?: string }>> = {
  "tong-quan": LayoutDashboard,
  "san-pham": Shirt,
  "danh-muc": FolderTree,
  "bang-size": Ruler,
  "don-hang": ShoppingBag,
  "ton-kho": Boxes,
  "nhap-kho": PackagePlus,
  // Nhà kho: nói về **nơi chứa**, phân biệt với Boxes (số lượng tồn) và
  // PackagePlus (hàng nhập về). Ba mục kho, ba icon khác nhau — thu gọn thanh
  // bên thì chỉ còn cột icon, trùng nhau là mất đường.
  kho: Warehouse,
  "hoa-don": ReceiptText,
  "khach-hang": Users,
  "khuyen-mai": TicketPercent,
  "ho-tro": LifeBuoy,
  "bao-cao": BarChart3,
  // Khiên chứ không phải hình người: `Users` đã là mục Khách hàng, hai mục cùng
  // icon thì lúc thu gọn không phân biệt được — đúng cái mà bản chấm vuông mắc.
  "nhan-su": ShieldCheck,
  "cai-dat": Settings,
};

export function AdminShell({
  nav,
  user,
  viec,
  crumb,
  children,
}: {
  nav: AdminNavItem[];
  user: { name: string; roleLabel: string; email: string | null };
  /** Việc đang chờ, hiện ở nút chuông. */
  viec: Viec[];
  crumb: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(true);
  const [drawer, setDrawer] = React.useState(false);

  React.useEffect(() => {
    setOpen(window.localStorage.getItem(SIDEBAR_KEY) !== "0");
  }, []);

  React.useEffect(() => setDrawer(false), [pathname]);

  const toggle = () => {
    setOpen((v) => {
      window.localStorage.setItem(SIDEBAR_KEY, v ? "0" : "1");
      return !v;
    });
  };

  return (
    // `theme-glass` / `theme-modernist`: admin có bộ token riêng, storefront đổi
    // gì cũng không kéo admin đổi theo.
    <div className={cn("flex min-h-screen", GLASS ? "theme-glass" : "theme-modernist")}>
      <aside
        className={cn(
          "sticky hidden flex-none overflow-y-auto lg:block",
          GLASS
            ? "glass top-3 my-3 ml-3 h-[calc(100vh-24px)] rounded-[26px] text-muted shadow-soft [scrollbar-width:none]"
            : "top-0 h-screen bg-neutral-900 text-bg",
          open ? (GLASS ? "w-[248px]" : "w-[232px]") : GLASS ? "w-[72px]" : "w-[64px]",
        )}
      >
        <SidebarInner nav={nav} pathname={pathname} open={open} onToggle={toggle} />
      </aside>

      <div className="min-w-0 flex-1">
        <header
          className={cn(
            "sticky z-60 flex items-center gap-4",
            GLASS
              ? "glass top-3 mx-3 mt-3 rounded-full py-1.5 pl-5 pr-2 shadow-[0_10px_30px_rgba(60,40,20,0.1)] lg:py-2"
              : "top-0 border-b-2 border-border-soft bg-bg px-4 py-3 lg:px-7 lg:py-3.5",
          )}
        >
          <button
            type="button"
            aria-label="Mở menu quản trị"
            onClick={() => setDrawer(true)}
            className="-ml-2 flex h-11 w-11 items-center justify-center lg:hidden"
          >
            <Menu size={22} />
          </button>

          <p className="label-tech truncate font-bold tracking-[0.08em]">{crumb}</p>

          <div className={cn("ml-auto flex items-center", GLASS ? "gap-2" : "gap-3")}>
            <form
              action="/admin/don-hang"
              method="get"
              role="search"
              className={cn(
                "hidden w-[260px] items-center gap-2 xl:flex",
                GLASS
                  ? "w-[280px] rounded-full border border-[var(--glass-edge)] bg-field px-3.5 py-2"
                  : "border border-border-soft bg-subtle px-3 py-2.5",
              )}
            >
              <Search size={14} className="flex-none text-faint" aria-hidden />
              <input
                name="q"
                aria-label="Tìm đơn, sản phẩm, khách"
                placeholder="Tìm đơn, sản phẩm, khách hàng…"
                className="w-full border-0 bg-transparent text-[13px] outline-none"
              />
            </form>

            <AlertBell viec={viec} />

            <AdminAccountMenu user={user} />
          </div>
        </header>

        {/* `key` theo đường dẫn: đổi trang là dựng lại khối, hiệu ứng vào trang chạy lại. */}
        <div key={pathname} className={cn(GLASS ? "adm-page p-4 lg:p-7 lg:pt-6" : "p-4 lg:p-7")}>
          {children}
        </div>
      </div>

      {drawer ? (
        <MobileDrawer nav={nav} pathname={pathname} onClose={() => setDrawer(false)} />
      ) : null}
    </div>
  );
}

function SidebarInner({
  nav,
  pathname,
  open,
  onToggle,
}: {
  nav: AdminNavItem[];
  pathname: string;
  open: boolean;
  onToggle?: () => void;
}) {
  const khoi = gomNhom(nav);

  return (
    <>
      {/*
        Thu gọn thì **xếp dọc**. Xếp ngang trong 64px không đủ chỗ: ô vuông 18px
        + khoảng cách 10px + nút 26px + padding 2×16px là 86px, thừa ra 22px.
        `aside` đặt `overflow-y-auto`, mà theo CSS một trục khác `visible` thì
        trục kia tự thành `auto` — nên phần thừa bị cắt, nút mở lại mất một góc
        và đáy thanh bên mọc thêm thanh cuộn ngang.
      */}
      <div
        className={cn(
          "flex",
          !GLASS && "border-b border-neutral-700",
          open ? "items-center gap-2.5 px-4 py-5" : "flex-col items-center gap-3 px-0 py-4",
        )}
      >
        <span
          className={cn(
            "block flex-none",
            GLASS
              ? "h-4 w-4 rounded-full bg-[linear-gradient(150deg,#f07a63,var(--color-accent))]"
              : "h-[18px] w-[18px] bg-accent",
          )}
          aria-hidden
        />
        {open ? (
          <span
            className={cn(
              "whitespace-nowrap text-[13px] uppercase tracking-[0.04em]",
              GLASS ? "font-bold text-text" : "font-extrabold",
            )}
          >
            MSH Admin
          </span>
        ) : null}
        {onToggle ? (
          <button
            type="button"
            onClick={onToggle}
            aria-label={open ? "Thu gọn thanh bên" : "Mở rộng thanh bên"}
            className={cn(
              "flex h-[26px] w-[26px] flex-none items-center justify-center",
              GLASS
                ? "rounded-full border border-[var(--glass-edge)] bg-field hover:bg-white"
                : "border border-muted",
              open && "ml-auto",
            )}
          >
            {open ? <PanelLeftClose size={13} /> : <PanelLeftOpen size={13} />}
          </button>
        ) : null}
      </div>

      <nav className="flex flex-col py-2">
        {khoi.dau.map((n) => (
          <MucNav key={n.href} muc={n} pathname={pathname} open={open} />
        ))}

        {khoi.nhom.map((g) => (
          <div key={g.key} className="contents">
            {/*
              Mở rộng thì tiêu đề nhóm; thu gọn thì một vạch ngăn.
              Thu gọn chỉ còn 64px, không đủ chỗ cho chữ nào — mà bỏ hẳn dấu ngăn
              thì mười lăm icon dính liền thành một cột không có nhịp nào để mắt bám.
            */}
            {open ? (
              <span
                className={cn(
                  "label-tech pb-1 pt-4 text-[10.5px] font-bold",
                  GLASS ? "px-6 text-faint" : "px-3.5 text-neutral-500",
                )}
              >
                {g.label.toUpperCase()}
              </span>
            ) : (
              <span
                aria-hidden
                className={cn("mx-auto my-2 block h-px w-6", GLASS ? "bg-stone" : "bg-neutral-700")}
              />
            )}
            {g.items.map((n) => (
              <MucNav key={n.href} muc={n} pathname={pathname} open={open} />
            ))}
          </div>
        ))}
      </nav>
    </>
  );
}

/** Một dòng trong thanh bên. Tách ra để cả mục đứng riêng lẫn mục trong nhóm
 * dùng chung một thân, không phải chép hai bản. */
function MucNav({
  muc: n,
  pathname,
  open,
}: {
  muc: AdminNavItem;
  pathname: string;
  open: boolean;
}) {
  const active = n.href === "/admin" ? pathname === "/admin" : pathname.startsWith(n.href);
  const Icon = ICON[n.icon];
  const body = (
    <>
      <Icon
        size={17}
        className={cn(
          "flex-none",
          active ? "text-accent" : n.soon ? "text-neutral-600" : GLASS ? "opacity-60" : "text-muted",
        )}
        aria-hidden
      />
      {open ? <span className="truncate">{n.label}</span> : null}
    </>
  );

  /*
   * Thu gọn thì bỏ padding ngang và căn giữa: 64px trừ viền trái 3px còn 61px,
   * để nguyên `px-3.5` là icon lệch hẳn sang trái.
   */
  const base = GLASS
    ? cn(
        "mx-2.5 my-px flex items-center overflow-hidden whitespace-nowrap rounded-full py-2.5 text-left text-[14px] transition-[background-color,color,box-shadow] duration-200",
        open ? "gap-3 px-3.5" : "justify-center px-0",
      )
    : cn(
        "flex items-center overflow-hidden whitespace-nowrap border-l-[3px] py-3 text-left text-[13.5px]",
        open ? "gap-3 px-3.5" : "justify-center px-0",
      );

  // Mục của milestone sau: hiện nhưng mờ và không bấm được.
  if (n.soon) {
    return (
      <span
        title={n.label + " — mở ở milestone sau"}
        aria-disabled="true"
        className={cn(base, GLASS ? "text-faint" : "border-transparent text-neutral-500")}
      >
        {body}
      </span>
    );
  }

  return (
    <Link
      href={n.href as Route}
      title={n.label}
      className={cn(
        base,
        GLASS
          ? active
            ? "bg-white font-semibold text-text shadow-[0_4px_12px_rgba(60,40,20,0.1)]"
            : "text-muted hover:bg-white/40 hover:text-text"
          : active
            ? "border-accent bg-neutral-800 font-extrabold text-bg"
            : "border-transparent font-normal text-hairline hover:bg-neutral-800",
      )}
    >
      {body}
    </Link>
  );

}

function MobileDrawer({
  nav,
  pathname,
  onClose,
}: {
  nav: AdminNavItem[];
  pathname: string;
  onClose: () => void;
}) {
  const panelRef = useOverlay(true, onClose);

  return (
    <div
      className={cn(
        "fixed inset-0 z-80 flex lg:hidden",
        GLASS ? "bg-scrim backdrop-blur-[var(--scrim-blur)]" : "bg-neutral-900/55",
      )}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Menu quản trị"
        className={cn(
          "flex h-full w-[86%] max-w-[280px] flex-col overflow-y-auto",
          GLASS ? "glass m-2.5 h-[calc(100%-20px)] rounded-[26px] text-muted" : "bg-neutral-900 text-bg",
        )}
      >
        <button
          type="button"
          aria-label="Đóng menu"
          onClick={onClose}
          className={cn(
            "absolute right-2 top-3 flex h-11 w-11 items-center justify-center",
            GLASS ? "text-text" : "text-bg",
          )}
        >
          <X size={22} />
        </button>
        <SidebarInner nav={nav} pathname={pathname} open />
      </div>
    </div>
  );
}

