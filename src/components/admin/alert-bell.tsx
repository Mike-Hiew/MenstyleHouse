"use client";

import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";
import { cn } from "@/lib/cn";

export type Viec = { key: string; nhan: string; so: number; href: string };

/**
 * Nút chuông: việc đang chờ người xử lý.
 *
 * Bản trước là một `<button>` **không có `onClick`** mà vẫn đeo chấm đỏ báo có
 * thông báo mới. Nút không làm gì đã tệ; đeo chấm đỏ là nói dối người dùng.
 *
 * Không có gì chờ thì **không có chấm đỏ** — chấm chỉ sáng khi thật sự có việc.
 */
export function AlertBell({ viec }: { viec: Viec[] }) {
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

  const tong = viec.reduce((n, v) => n + v.so, 0);

  return (
    <div ref={boc} className="relative hidden sm:block">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={mo}
        aria-label={tong > 0 ? `Việc cần làm, ${tong} mục` : "Việc cần làm — không có gì mới"}
        onClick={() => setMo((v) => !v)}
        className={cn(
          "relative flex h-[38px] w-[38px] items-center justify-center border border-border-soft",
          mo && "bg-subtle",
        )}
      >
        <Bell size={16} aria-hidden />
        {tong > 0 ? (
          <span className="absolute -right-px -top-px block h-2 w-2 bg-accent" aria-hidden />
        ) : null}
      </button>

      {mo ? (
        <div
          role="menu"
          aria-label="Việc cần làm"
          className="absolute right-0 top-[calc(100%+8px)] z-90 w-[300px] border-2 border-divider bg-bg shadow-[6px_6px_0_0_rgba(32,30,29,0.12)]"
        >
          <p className="label-tech border-b-2 border-divider px-4 py-3 font-bold">VIỆC CẦN LÀM</p>

          {viec.length === 0 ? (
            <p className="px-4 py-6 text-[13.5px] text-muted">
              Không có gì đang chờ. Đơn đã xác nhận hết, kho chưa có gì sắp hết.
            </p>
          ) : (
            viec.map((v) => (
              <Link
                key={v.key}
                href={v.href as Route}
                role="menuitem"
                className="flex min-h-12 items-center gap-3 border-b border-hairline px-4 text-[13.5px] hover:bg-subtle"
              >
                <span className="min-w-[28px] font-mono text-[15px] font-extrabold text-accent-700">
                  {v.so}
                </span>
                <span className="flex-1">{v.nhan}</span>
              </Link>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
