"use client";

import Image from "next/image";
import { useActionState } from "react";
import { cn } from "@/lib/cn";
import { saveQrAction, type AdminActionState } from "@/app/admin/actions";

/**
 * Ảnh QR chuyển khoản.
 *
 * Form riêng, không nằm trong form cài đặt chung: gộp lại thì mỗi lần sửa một
 * con số cũng phải gửi kèm cả tấm ảnh qua Server Action. Ảnh lưu trong DB như
 * ảnh sản phẩm (M4.5), nén **không mất dữ liệu** để máy quét luôn đọc được.
 */
export function QrUpload({ qrUrl }: { qrUrl: string | null }) {
  const [state, save, pending] = useActionState<AdminActionState, FormData>(saveQrAction, {});

  return (
    <div className="border-2 border-border-soft p-4">
      <p className="label-tech mb-3 font-bold">ẢNH QR CHUYỂN KHOẢN</p>

      {state.message ? (
        <p
          role="alert"
          className={cn(
            "mb-3 text-[13px] font-semibold",
            state.ok ? "text-muted" : "text-accent-800",
          )}
        >
          {state.message}
        </p>
      ) : null}

      <div className="flex flex-wrap items-start gap-4">
        <div className="relative h-[150px] w-[150px] flex-none border border-border-soft bg-white">
          {qrUrl ? (
            <Image src={qrUrl} alt="Mã QR chuyển khoản" fill sizes="150px" className="object-contain p-1.5" />
          ) : (
            <span className="grid h-full place-items-center px-3 text-center text-[12px] text-faint">
              Chưa có ảnh QR
            </span>
          )}
        </div>

        <div className="min-w-[220px] flex-1">
          <form action={save} className="flex flex-col gap-2.5">
            <input
              type="file"
              name="qr"
              accept="image/jpeg,image/png,image/webp,image/avif"
              required
              className="w-full border border-border-soft bg-bg px-3 py-2.5 text-[13px] file:mr-3 file:border-0 file:bg-neutral-900 file:px-3 file:py-1.5 file:text-[12px] file:font-extrabold file:text-bg"
            />
            <button
              type="submit"
              disabled={pending}
              className="min-h-12 bg-accent px-5 text-[13px] font-extrabold text-bg disabled:opacity-60"
            >
              {pending ? "Đang tải…" : qrUrl ? "THAY ẢNH QR" : "TẢI ẢNH QR LÊN"}
            </button>
          </form>

          {qrUrl ? (
            <form action={save} className="mt-2.5">
              <input type="hidden" name="go" value="1" />
              <button
                type="submit"
                className="flex min-h-11 items-center text-[12.5px] text-faint underline"
              >
                Gỡ ảnh QR
              </button>
            </form>
          ) : null}

          <p className="mt-3 text-[12px] leading-[1.6] text-faint">
            Ảnh hiện ở bước thanh toán khi khách chọn chuyển khoản. Nén không mất dữ liệu để máy
            quét luôn đọc được, nên dùng đúng ảnh VietQR tải từ ngân hàng.
          </p>
        </div>
      </div>
    </div>
  );
}
