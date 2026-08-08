"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import { IconButton } from "./button";
import { useOverlay } from "./overlay";

/**
 * Dưới `lg:` mọi Dialog tự chuyển thành sheet đáy (rộng hết màn, cao tối đa
 * 85vh, chân nút cố định) — quy tắc trong `docs/RESPONSIVE.md`. Chỉ đổi bằng
 * CSS nên không có nhánh JSX riêng cho mobile.
 */
export function Dialog({
  open,
  onClose,
  title,
  width = 560,
  children,
  actions,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  width?: number;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  const panelRef = useOverlay(open, onClose);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-neutral-900/55 lg:items-center lg:p-6"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{ ["--dialog-w" as string]: width + "px" }}
        className={cn(
          "flex max-h-[85vh] w-full flex-col border-t-2 border-divider bg-surface",
          "pb-[env(safe-area-inset-bottom)]",
          "lg:max-h-[88vh] lg:w-[var(--dialog-w)] lg:border-2 lg:pb-0",
        )}
      >
        <div className="flex flex-none items-center justify-between border-b-2 border-divider px-5 py-3.5">
          <h2 className="text-[17px] font-extrabold">{title}</h2>
          <IconButton aria-label="Đóng" onClick={onClose}>
            <X size={18} />
          </IconButton>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>

        {actions ? (
          <div className="flex flex-none justify-end gap-2 border-t-2 border-divider px-5 py-3.5">
            {actions}
          </div>
        ) : null}
      </div>
    </div>
  );
}
