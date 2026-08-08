"use client";

import * as React from "react";
import Link from "next/link";
import { useOverlay } from "@/components/ui/overlay";

/**
 * Popup mời đăng ký. Ba luật trong `docs/CLAUDE-rules.md`, không được phá:
 * hiện **một lần mỗi phiên**, **tự tắt sau 15 giây**, và có nút thoát rõ ràng.
 * Không bao giờ chặn mua hàng — khách vãng lai đóng lại là mua tiếp được.
 *
 * Nhãn nút lấy theo mockup ("MUA VỚI TƯ CÁCH KHÁCH"), không phải "Để sau".
 */

const KEY = "msh:welcome-seen";
const DELAY_MS = 6_000;
const AUTO_CLOSE_MS = 15_000;

const MEMBER_PERKS = [
  "Tích 1 điểm cho mỗi 1.000đ đã thanh toán, đổi trực tiếp vào đơn sau.",
  "Lưu sổ địa chỉ, lần sau đặt hàng chỉ mất vài giây.",
  "Xem lại toàn bộ đơn cũ, không cần nhớ mã đơn.",
  "Nhận mã giảm giá riêng cho thành viên.",
];

const GUEST_PERKS = [
  "Mua được toàn bộ luồng, không cần tài khoản.",
  "Tra cứu đơn bằng mã đơn và 4 số cuối điện thoại.",
  "Không tích điểm, không lưu địa chỉ.",
  "Đổi trả vẫn áp dụng như thành viên.",
];

export function WelcomeDialog() {
  const [open, setOpen] = React.useState(false);

  const close = React.useCallback(() => {
    setOpen(false);
    window.sessionStorage.setItem(KEY, "1");
  }, []);

  React.useEffect(() => {
    if (window.sessionStorage.getItem(KEY)) return;
    const show = setTimeout(() => setOpen(true), DELAY_MS);
    return () => clearTimeout(show);
  }, []);

  // Tự tắt sau 15 giây kể từ lúc hiện.
  React.useEffect(() => {
    if (!open) return;
    const t = setTimeout(close, AUTO_CLOSE_MS);
    return () => clearTimeout(t);
  }, [open, close]);

  const panelRef = useOverlay(open, close);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-80 flex items-center justify-center bg-[rgba(32,30,29,.72)] p-4 lg:p-8"
      onMouseDown={(e) => e.target === e.currentTarget && close()}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Mời đăng ký thành viên"
        className="grid max-h-[90vh] w-full max-w-[840px] overflow-y-auto border-2 border-divider bg-bg lg:grid-cols-[1fr_300px]"
      >
        <div className="p-6 lg:p-10">
          <p className="label-tech mb-4 font-bold text-accent">
            MEN STYLE HOUSE — THÀNH VIÊN
          </p>
          <h2 className="mb-3.5 text-[26px] leading-[1.05] lg:text-[38px]">
            Mua tiếp cũng được.
            <br />
            Đăng ký thì lời hơn.
          </h2>
          <p className="mb-5 text-[14.5px] leading-[1.7] text-muted">
            Bạn không cần tài khoản để đặt hàng. Nhưng có tài khoản thì mỗi đơn đều sinh ra thứ gì
            đó cho lần sau.
          </p>

          <ul className="mb-7 grid gap-2.5">
            {MEMBER_PERKS.map((p) => (
              <li key={p} className="flex gap-3 text-[14px] leading-[1.6]">
                <span className="mt-[7px] h-[7px] w-[7px] flex-none bg-accent" aria-hidden />
                <span>{p}</span>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href={{ pathname: "/dang-ky" }}
              onClick={close}
              className="flex min-h-12 items-center bg-accent px-6 text-[14px] font-extrabold tracking-[0.02em] text-bg"
            >
              ĐĂNG KÝ — TẶNG 100 ĐIỂM
            </Link>
            <button
              type="button"
              onClick={close}
              className="flex min-h-12 items-center border border-border-soft px-6 text-[14px] font-extrabold"
            >
              MUA VỚI TƯ CÁCH KHÁCH
            </button>
          </div>

          <p className="mt-4 text-[13.5px] text-muted">
            Đã có tài khoản?{" "}
            <Link
              href={{ pathname: "/dang-nhap" }}
              onClick={close}
              className="font-extrabold text-accent-700 underline"
            >
              Đăng nhập
            </Link>
          </p>
        </div>

        <div className="flex flex-col justify-between bg-neutral-900 p-6 text-hairline lg:p-8">
          <div>
            <p className="label-tech mb-4 font-bold text-neutral-400">KHÁCH VÃNG LAI</p>
            <ul className="grid gap-2.5">
              {GUEST_PERKS.map((p) => (
                <li key={p} className="flex gap-2.5 text-[13px] leading-[1.55]">
                  <span className="mt-1.5 h-1.5 w-1.5 flex-none bg-muted" aria-hidden />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>
          <p className="mt-6 text-[12px] leading-[1.6] text-neutral-400">
            Cửa sổ này tự đóng sau 15 giây và chỉ hiện một lần mỗi phiên.
          </p>
        </div>
      </div>
    </div>
  );
}
