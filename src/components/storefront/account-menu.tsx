"use client";

import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { ChevronDown, LogOut, MapPin, Heart, Receipt, ShieldCheck, User } from "lucide-react";
import { cn } from "@/lib/cn";
import { logoutAction } from "@/app/(tai-khoan)/actions";

export type ThanhVien = {
  name: string;
  points: number;
  /** `null` khi cửa hàng tắt chương trình hạng thành viên trong Cài đặt. */
  hang: string | null;
  /** Còn thiếu bao nhiêu để lên hạng kế tiếp; `null` là đã ở hạng cao nhất. */
  thieu: { hang: string; thieu: number } | null;
};

const MUC: { href: Route; ten: string; Icon: typeof Receipt }[] = [
  { href: "/tai-khoan?tab=don-hang", ten: "Lịch sử đơn hàng", Icon: Receipt },
  { href: "/tai-khoan?tab=ho-so", ten: "Hồ sơ & mật khẩu", Icon: User },
  { href: "/tai-khoan?tab=dia-chi", ten: "Sổ địa chỉ", Icon: MapPin },
  { href: "/tai-khoan?tab=yeu-thich", ten: "Sản phẩm yêu thích", Icon: Heart },
];

/**
 * Bấm vào ô tài khoản thì xổ xuống ngay điểm, hạng và nút đăng xuất.
 *
 * Trước đây ô này là một liên kết thẳng sang `/tai-khoan`: muốn xem còn bao
 * nhiêu điểm hay chỉ để đăng xuất cũng phải rời trang đang xem, rồi bấm quay
 * lại. Đây là thao tác lặp nhiều nhất của một người đã đăng nhập.
 *
 * Không dùng `useOverlay` như drawer: hook đó khoá cuộn trang và bẫy Tab cho
 * hộp thoại toàn màn hình. Menu xổ chỉ cần đóng khi bấm ra ngoài hoặc bấm Esc,
 * và **không được** khoá cuộn — nó nằm trong header dính.
 */
export function AccountMenu({ ban, vaiTro }: { ban: ThanhVien; vaiTro: string | null }) {
  const [mo, setMo] = React.useState(false);
  const boc = React.useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Điều hướng xong thì đóng, nếu không menu treo lại trên trang mới.
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
    <div ref={boc} className="relative hidden lg:block">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={mo}
        aria-label={
          `Tài khoản của ${ban.name}, ${ban.points} điểm` +
          (ban.hang ? `, hạng ${ban.hang}` : "")
        }
        onClick={() => setMo((v) => !v)}
        className={cn(
          "flex items-center gap-2.5 border py-1.5 pl-1.5 pr-2.5 text-left",
          mo ? "border-divider bg-subtle" : "border-border-soft hover:bg-subtle",
        )}
      >
        <span className="grid h-7 w-7 flex-none place-items-center bg-neutral-900 font-heading text-[11px] font-extrabold text-bg">
          {chuTat(ban.name)}
        </span>
        <span>
          <span className="block max-w-[120px] truncate text-[12.5px] font-bold">{ban.name}</span>
          <span className="block font-mono text-[10px] font-bold leading-[1.3] text-accent-600">
            {ban.points} điểm{ban.hang ? " · " + ban.hang : ""}
          </span>
        </span>
        <ChevronDown
          size={14}
          aria-hidden
          className={cn("flex-none transition-transform", mo && "rotate-180")}
        />
      </button>

      {mo ? (
        <div
          role="menu"
          aria-label="Tài khoản"
          className="absolute right-0 top-[calc(100%+6px)] z-90 w-[280px] border-2 border-divider bg-bg shadow-[6px_6px_0_0_rgba(32,30,29,0.12)]"
        >
          <div className="bg-neutral-900 p-4 text-bg">
            <p className="text-[14.5px] font-extrabold leading-tight">{ban.name}</p>
            {ban.hang ? (
              <p className="label-tech mt-1 text-neutral-400">HẠNG {ban.hang}</p>
            ) : null}

            <div className="mt-3 flex items-baseline gap-2 border-t border-neutral-700 pt-3">
              <span className="text-[30px] font-extrabold leading-none tracking-[-0.03em]">
                {ban.points}
              </span>
              <span className="text-[12px] text-hairline">điểm thưởng</span>
            </div>

            {ban.hang ? (
              <p className="mt-1.5 text-[11.5px] leading-[1.55] text-neutral-400">
                {ban.thieu
                  ? `Còn ${dinh(ban.thieu.thieu)} nữa lên hạng ${ban.thieu.hang}.`
                  : "Bạn đang ở hạng cao nhất."}
              </p>
            ) : null}
          </div>

          {vaiTro ? (
            <Link
              href={{ pathname: "/admin" }}
              role="menuitem"
              className="flex min-h-12 items-center gap-2.5 border-b border-hairline bg-subtle px-4 text-[13.5px] font-extrabold"
            >
              <ShieldCheck size={16} aria-hidden />
              Khu quản trị
              <span className="ml-auto text-[11.5px] font-semibold text-muted">{vaiTro}</span>
            </Link>
          ) : null}

          {MUC.map((m) => (
            <Link
              key={m.href}
              href={m.href}
              role="menuitem"
              className="flex min-h-12 items-center gap-2.5 border-b border-hairline px-4 text-[13.5px] hover:bg-subtle"
            >
              <m.Icon size={16} className="flex-none text-faint" aria-hidden />
              {m.ten}
            </Link>
          ))}

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

/** Chữ tắt hai ký tự cho ô avatar — mockup dùng "MA". */
export function chuTat(name: string): string {
  const parts = name.trim().split(/\s+/);
  const dau = parts[0] ?? "";
  const cuoi = parts[parts.length - 1] ?? "";
  return ((dau[0] ?? "") + (cuoi[0] ?? "")).toUpperCase() || "MSH";
}

/** Rút gọn tiền cho khung hẹp: 1.200.000 ₫ → "1,2 triệu". */
function dinh(v: number): string {
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1).replace(".", ",") + " triệu";
  return new Intl.NumberFormat("vi-VN").format(v) + " ₫";
}
