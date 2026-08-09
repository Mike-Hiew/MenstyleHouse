"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, ExternalLink, LogOut, Store, User } from "lucide-react";
import { cn } from "@/lib/cn";
import { logoutAction } from "@/app/(tai-khoan)/actions";

/**
 * Cụm tài khoản ở góc phải khu quản trị, bấm vào thì xổ xuống.
 *
 * Trước đây đây là một khối chữ trơ: nhân viên muốn đăng xuất phải sang
 * `/tai-khoan` ngoài cửa hàng rồi tìm nút ở đó. Cuối ca ai cũng làm việc này.
 *
 * Giống menu ngoài cửa hàng nhưng nội dung khác: người trong khu quản trị cần
 * **vai trò** và lối quay về cửa hàng, không cần điểm thưởng.
 */
export function AdminAccountMenu({
  user,
}: {
  user: { name: string; roleLabel: string; email: string | null };
}) {
  const [mo, setMo] = React.useState(false);
  const boc = React.useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  React.useEffect(() => setMo(false), [pathname]);

  React.useEffect(() => {
    if (!mo) return;
    const ngoai = (e: MouseEvent) => {
      if (boc.current && !boc.current.contains(e.target as Node)) setMo(false);
    };
    const phim = (e: KeyboardEvent) => e.key === "Escape" && setMo(false);
    document.addEventListener("mousedown", ngoai);
    document.addEventListener("keydown", phim);
    return () => {
      document.removeEventListener("mousedown", ngoai);
      document.removeEventListener("keydown", phim);
    };
  }, [mo]);

  return (
    <div ref={boc} className="relative border-hairline pl-3 sm:border-l">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={mo}
        aria-label={`Tài khoản của ${user.name}, vai trò ${user.roleLabel}`}
        onClick={() => setMo((v) => !v)}
        className={cn(
          "flex min-h-11 items-center gap-2.5 px-1 py-1",
          mo && "bg-subtle",
        )}
      >
        <span className="grid h-8 w-8 flex-none place-items-center bg-neutral-900 font-heading text-[12px] font-extrabold text-bg">
          {chuTat(user.name)}
        </span>
        <span className="hidden text-left sm:block">
          <span className="block text-[13px] font-extrabold leading-[1.2]">{user.name}</span>
          <span className="label-tech block">{user.roleLabel}</span>
        </span>
        <ChevronDown
          size={14}
          aria-hidden
          className={cn("hidden flex-none transition-transform sm:block", mo && "rotate-180")}
        />
      </button>

      {mo ? (
        <div
          role="menu"
          aria-label="Tài khoản quản trị"
          className="absolute right-0 top-[calc(100%+8px)] z-90 w-[268px] border-2 border-divider bg-bg shadow-[6px_6px_0_0_rgba(32,30,29,0.12)]"
        >
          <div className="bg-neutral-900 p-4 text-bg">
            <p className="text-[14.5px] font-extrabold leading-tight">{user.name}</p>
            <p className="label-tech mt-1 text-neutral-400">{user.roleLabel.toUpperCase()}</p>
            {user.email ? (
              <p className="mt-2 truncate font-mono text-[11.5px] text-hairline">{user.email}</p>
            ) : null}
          </div>

          <Link
            href="/"
            role="menuitem"
            className="flex min-h-12 items-center gap-2.5 border-b border-hairline px-4 text-[13.5px] hover:bg-subtle"
          >
            <Store size={16} className="flex-none text-faint" aria-hidden />
            Xem cửa hàng
            <ExternalLink size={13} className="ml-auto flex-none text-faint" aria-hidden />
          </Link>

          <Link
            href="/tai-khoan?tab=ho-so"
            role="menuitem"
            className="flex min-h-12 items-center gap-2.5 border-b border-hairline px-4 text-[13.5px] hover:bg-subtle"
          >
            <User size={16} className="flex-none text-faint" aria-hidden />
            Hồ sơ & mật khẩu
          </Link>

          <form action={logoutAction}>
            <button
              type="submit"
              role="menuitem"
              className="flex min-h-12 w-full items-center gap-2.5 px-4 text-left text-[13.5px] font-extrabold text-accent-700 hover:bg-subtle"
            >
              <LogOut size={16} className="flex-none" aria-hidden />
              Đăng xuất
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function chuTat(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")).toUpperCase() || "MSH";
}
