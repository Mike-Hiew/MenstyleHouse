import * as React from "react";
import { cn } from "@/lib/cn";

/**
 * Chữ 16px ở mốc mặc định là bắt buộc: dưới 16px thì iOS Safari tự phóng to
 * trang khi khách chạm vào ô nhập. Desktop mới hạ xuống 14px.
 */
const fieldBase =
  "w-full border-2 border-divider bg-surface px-3 text-[16px] text-text lg:text-[14px] " +
  "placeholder:text-neutral-400 focus:border-accent focus-visible:outline-none " +
  "disabled:opacity-45";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn(fieldBase, "h-12 lg:h-11", className)} {...props} />;
});

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return (
    <textarea ref={ref} className={cn(fieldBase, "py-2.5 min-h-24", className)} {...props} />
  );
});

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className, ...props }, ref) {
  return (
    <select
      ref={ref}
      className={cn(fieldBase, "h-12 appearance-none pr-8 lg:h-11", className)}
      {...props}
    />
  );
});

export function Field({
  label,
  hint,
  error,
  required,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[12px] font-semibold uppercase tracking-[0.08em] text-neutral-600">
        {label}
        {required ? <span className="text-accent"> *</span> : null}
      </label>
      {children}
      {error ? (
        <span className="text-[12px] font-medium text-accent-700">{error}</span>
      ) : hint ? (
        <span className="text-[12px] text-neutral-500">{hint}</span>
      ) : null}
    </div>
  );
}

export function Checkbox({
  label,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: React.ReactNode }) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-[14px]">
      <input
        type="checkbox"
        className={cn(
          "h-[18px] w-[18px] appearance-none border-2 border-divider bg-surface",
          "checked:border-accent checked:bg-accent",
          "checked:bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22white%22 stroke-width=%224%22><path d=%22M4 12l5 5L20 6%22/></svg>')] checked:bg-contain",
          className,
        )}
        {...props}
      />
      {label}
    </label>
  );
}

export function Radio({
  label,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: React.ReactNode }) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-[14px]">
      <input
        type="radio"
        className={cn(
          "h-[18px] w-[18px] appearance-none border-2 border-divider bg-surface",
          "checked:border-accent checked:border-[5px]",
          className,
        )}
        {...props}
      />
      {label}
    </label>
  );
}
