"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import { IconButton } from "./button";

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
  const panelRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key !== "Tab" || !panelRef.current) return;
      const items = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])',
      );
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.querySelector<HTMLElement>("button,input,select,textarea")?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/55 p-6"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{ width }}
        className="max-h-[88vh] w-full overflow-auto border-2 border-divider bg-surface"
      >
        <div className="flex items-center justify-between border-b-2 border-divider px-5 py-3.5">
          <h2 className="text-[17px] font-extrabold">{title}</h2>
          <IconButton aria-label="Đóng" onClick={onClose}>
            <X size={18} />
          </IconButton>
        </div>
        <div className="px-5 py-5">{children}</div>
        {actions ? (
          <div className={cn("flex justify-end gap-2 border-t-2 border-divider px-5 py-3.5")}>
            {actions}
          </div>
        ) : null}
      </div>
    </div>
  );
}
