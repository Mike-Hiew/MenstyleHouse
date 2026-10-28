import * as React from "react";
import { cn } from "@/lib/cn";

/**
 * Chữ 16px ở mốc mặc định là bắt buộc: dưới 16px thì iOS Safari tự phóng to
 * trang khi khách chạm vào ô nhập. Desktop mới hạ xuống 14px.
 */
/**
 * Storefront: ô nền đặc, bo tròn, focus thì nền trắng + vòng sáng. Admin đặt
 * lại token nên vẫn là ô trắng viền 2px, focus viền đỏ.
 */
const fieldBase =
  "w-full rounded-full border-2 border-divider bg-field px-4 text-[16px] text-text lg:text-[14px] " +
  "transition-[background-color,box-shadow] placeholder:text-neutral-400 " +
  "focus:border-focus-line focus:bg-surface focus:ring-4 focus:ring-ring focus-visible:outline-none " +
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
    <textarea ref={ref} className={cn(fieldBase, "min-h-24 rounded-2xl py-3", className)} {...props} />
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
      <label className="text-[12.5px] font-semibold text-neutral-600">
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
          "h-[18px] w-[18px] flex-none appearance-none rounded-[6px] border-2 border-divider bg-field",
          "checked:border-text checked:bg-text",
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
          "h-[18px] w-[18px] flex-none appearance-none rounded-full border-2 border-divider bg-field",
          "checked:border-[5px] checked:border-text",
          className,
        )}
        {...props}
      />
      {label}
    </label>
  );
}
