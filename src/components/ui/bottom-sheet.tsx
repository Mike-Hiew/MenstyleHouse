"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import { useOverlay } from "./overlay";

/**
 * Sheet trượt từ đáy, dùng cho bộ lọc và sắp xếp trên mobile.
 * Chân sheet cố định để nút "Áp dụng" luôn thấy khi danh sách lọc dài.
 */
export function BottomSheet({
  open,
  onClose,
  title,
  children,
  footer,
  maxHeight = "85vh",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxHeight?: string;
}) {
  const panelRef = useOverlay(open, onClose);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-neutral-900/55"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{ maxHeight }}
        className={cn(
          "flex w-full flex-col border-t-2 border-divider bg-bg",
          // Chừa chỗ cho thanh gạch dưới của iPhone.
          "pb-[env(safe-area-inset-bottom)]",
        )}
      >
        <div className="flex flex-none items-center justify-between border-b-2 border-divider px-4 py-3.5">
          <h2 className="text-[17px] font-extrabold">{title}</h2>
          <button
            type="button"
            aria-label="Đóng"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center"
          >
            <X size={20} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4">{children}</div>

        {footer ? (
          <div className="flex flex-none gap-2 border-t-2 border-divider p-3">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}
