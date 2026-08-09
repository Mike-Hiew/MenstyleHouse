"use client";

import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { Menu, PanelLeftClose, PanelLeftOpen, Search, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { useOverlay } from "@/components/ui/overlay";
import type { AdminNavItem } from "./admin-nav";
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
    <div className="flex min-h-screen">
      <aside
        className={cn(
          "sticky top-0 hidden h-screen flex-none overflow-y-auto bg-neutral-900 text-bg lg:block",
          open ? "w-[232px]" : "w-[64px]",
        )}
      >
        <SidebarInner nav={nav} pathname={pathname} open={open} onToggle={toggle} />
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-60 flex items-center gap-4 border-b-2 border-border-soft bg-bg px-4 py-3 lg:px-7 lg:py-3.5">
          <button
            type="button"
            aria-label="Mở menu quản trị"
            onClick={() => setDrawer(true)}
            className="-ml-2 flex h-11 w-11 items-center justify-center lg:hidden"
          >
            <Menu size={22} />
          </button>

          <p className="label-tech truncate font-bold tracking-[0.08em]">{crumb}</p>

          <div className="ml-auto flex items-center gap-3">
            <form
              action="/admin/don-hang"
              method="get"
              role="search"
              className="hidden w-[260px] items-center gap-2 border border-border-soft bg-subtle px-3 py-2.5 xl:flex"
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

        <div className="p-4 lg:p-7">{children}</div>
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
  return (
    <>
      <div className="flex items-center gap-2.5 border-b border-neutral-700 px-4 py-5">
        <span className="block h-[18px] w-[18px] flex-none bg-accent" aria-hidden />
        {open ? (
          <span className="whitespace-nowrap text-[13px] font-extrabold uppercase tracking-[0.04em]">
            MSH Admin
          </span>
        ) : null}
        {onToggle ? (
          <button
            type="button"
            onClick={onToggle}
            aria-label={open ? "Thu gọn thanh bên" : "Mở rộng thanh bên"}
            className="ml-auto flex h-[26px] w-[26px] flex-none items-center justify-center border border-muted"
          >
            {open ? <PanelLeftClose size={13} /> : <PanelLeftOpen size={13} />}
          </button>
        ) : null}
      </div>

      <nav className="flex flex-col py-2">
        {nav.map((n) => {
          const active = n.href === "/admin" ? pathname === "/admin" : pathname.startsWith(n.href);
          const body = (
            <>
              <span
                className={cn(
                  "block h-2 w-2 flex-none",
                  active ? "bg-accent" : n.soon ? "bg-neutral-700" : "bg-muted",
                )}
                aria-hidden
              />
              {open ? <span className="truncate">{n.label}</span> : null}
            </>
          );

          const base =
            "flex items-center gap-3 overflow-hidden whitespace-nowrap border-l-[3px] px-3.5 py-3 text-left text-[13.5px]";

          // Mục của milestone sau: hiện nhưng mờ và không bấm được.
          if (n.soon) {
            return (
              <span
                key={n.href}
                title={n.label + " — mở ở milestone sau"}
                aria-disabled="true"
                className={cn(base, "border-transparent text-neutral-500")}
              >
                {body}
              </span>
            );
          }

          return (
            <Link
              key={n.href}
              href={n.href as Route}
              title={n.label}
              className={cn(
                base,
                active
                  ? "border-accent bg-neutral-800 font-extrabold text-bg"
                  : "border-transparent font-normal text-hairline hover:bg-neutral-800",
              )}
            >
              {body}
            </Link>
          );
        })}
      </nav>
    </>
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
      className="fixed inset-0 z-80 flex bg-neutral-900/55 lg:hidden"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Menu quản trị"
        className="flex h-full w-[86%] max-w-[280px] flex-col overflow-y-auto bg-neutral-900 text-bg"
      >
        <button
          type="button"
          aria-label="Đóng menu"
          onClick={onClose}
          className="absolute right-2 top-3 flex h-11 w-11 items-center justify-center text-bg"
        >
          <X size={22} />
        </button>
        <SidebarInner nav={nav} pathname={pathname} open />
      </div>
    </div>
  );
}

