"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Route } from "next";
import { cn } from "@/lib/cn";

/**
 * Thanh chuyển mục của khu Cài đặt.
 *
 * Nhìn là tab, nhưng mỗi mục là **một đường dẫn thật** chứ không phải trạng thái
 * client. Nhờ vậy gửi link cho người khác vẫn mở đúng mục, bấm Back lùi đúng
 * chỗ, và quan trọng hơn: mỗi trang chỉ tải dữ liệu của riêng nó.
 *
 * Mục đang mở nhận `aria-current="page"` — trình đọc màn hình cần nó, vì màu nền
 * đậm không nói được điều gì.
 */
const MUC: { href: Route; ten: string }[] = [
  { href: "/admin/cai-dat" as Route, ten: "Cửa hàng" },
  { href: "/admin/cai-dat/thanh-toan" as Route, ten: "Thanh toán" },
  { href: "/admin/cai-dat/van-chuyen" as Route, ten: "Vận chuyển & thuế" },
  { href: "/admin/cai-dat/khach-than-thiet" as Route, ten: "Khách thân thiết" },
];

export function SettingsTabs() {
  const path = usePathname();

  return (
    <nav
      aria-label="Mục cài đặt"
      className="mb-7 flex gap-1 overflow-x-auto border-b-2 border-divider"
    >
      {MUC.map((m) => {
        const dangMo = path === m.href;
        return (
          <Link
            key={m.href}
            href={m.href}
            aria-current={dangMo ? "page" : undefined}
            className={cn(
              "-mb-0.5 flex min-h-11 flex-none items-center whitespace-nowrap border-b-2 px-4 text-[13.5px]",
              dangMo
                ? "border-accent font-extrabold text-text"
                : "border-transparent text-muted hover:text-text",
            )}
          >
            {m.ten}
          </Link>
        );
      })}
    </nav>
  );
}
