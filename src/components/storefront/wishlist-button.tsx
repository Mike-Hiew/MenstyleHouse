"use client";

import * as React from "react";
import { Heart } from "lucide-react";
import { cn } from "@/lib/cn";
import { thichAction } from "@/app/(tai-khoan)/tai-khoan-actions";

/**
 * Nút thích một sản phẩm.
 *
 * Chưa đăng nhập thì **không giả vờ lưu được**: đổi thành một liên kết sang màn
 * đăng nhập. Cho bấm rồi im lặng quên đi là kiểu hỏng khó chịu nhất — khách
 * tưởng đã lưu, hôm sau quay lại không thấy gì.
 */
export function WishlistButton({
  productId,
  daThich,
  daDangNhap,
}: {
  productId: string;
  daThich: boolean;
  daDangNhap: boolean;
}) {
  const [thich, setThich] = React.useState(daThich);
  const [dangGui, batDau] = React.useTransition();

  if (!daDangNhap) {
    return (
      <a
        href="/dang-nhap"
        className="flex h-12 items-center gap-2 border-2 border-divider px-5 text-[13px] font-extrabold"
      >
        <Heart size={17} aria-hidden />
        ĐĂNG NHẬP ĐỂ LƯU
      </a>
    );
  }

  return (
    <button
      type="button"
      aria-pressed={thich}
      disabled={dangGui}
      onClick={() =>
        batDau(async () => {
          // Đổi trước cho nhanh tay, rồi lấy trạng thái thật từ server.
          setThich((t) => !t);
          setThich(await thichAction(productId));
        })
      }
      className={cn(
        "flex h-12 items-center gap-2 border-2 px-5 text-[13px] font-extrabold disabled:opacity-60",
        thich ? "border-accent bg-accent-100 text-accent-800" : "border-divider",
      )}
    >
      <Heart size={17} fill={thich ? "currentColor" : "none"} aria-hidden />
      {thich ? "ĐÃ THÍCH" : "YÊU THÍCH"}
    </button>
  );
}
