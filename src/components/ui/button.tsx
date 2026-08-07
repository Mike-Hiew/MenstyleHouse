import * as React from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center gap-2 font-semibold tracking-tight " +
  "transition-colors select-none disabled:opacity-45 disabled:pointer-events-none " +
  // Nhãn nút luôn dồn trái — quy tắc Modernist
  "justify-start text-left";

const variants: Record<Variant, string> = {
  primary:
    "bg-accent text-white hover:bg-accent-600 active:bg-accent-700",
  secondary:
    "bg-transparent text-text border-2 border-divider hover:bg-neutral-200 active:bg-neutral-300",
  ghost:
    "bg-transparent text-text hover:bg-neutral-200 active:bg-neutral-300",
  danger:
    "bg-transparent text-accent-700 border-2 border-accent hover:bg-accent-100 active:bg-accent-200",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-[13px]",
  md: "h-11 px-4 text-[14px]",
  lg: "h-13 px-5 text-[15px]",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  block?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { className, variant = "primary", size = "md", block, ...props },
    ref,
  ) {
    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], sizes[size], block && "w-full", className)}
        {...props}
      />
    );
  },
);

export function IconButton({
  className,
  variant = "ghost",
  ...props
}: ButtonProps) {
  return (
    <Button
      variant={variant}
      className={cn("h-11 w-11 justify-center px-0", className)}
      {...props}
    />
  );
}
