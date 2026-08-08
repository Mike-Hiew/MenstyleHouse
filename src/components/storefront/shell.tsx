import { cn } from "@/lib/cn";

/**
 * Khung ngang chuẩn của storefront — mockup dùng `max-width:1360px` với đệm
 * ngang 32px ở mọi màn. Mọi trang đi qua đây để lề luôn thẳng hàng.
 */
export function Container({
  className,
  narrow,
  children,
}: {
  className?: string;
  /** Giỏ, checkout và kết quả đơn dùng khung hẹp 1100px trong mockup. */
  narrow?: boolean;
  children: React.ReactNode;
}) {
  if (narrow) {
    return (
      <div className={cn("mx-auto w-full max-w-[1100px] px-4 lg:px-8", className)}>{children}</div>
    );
  }
  // Mobile 16px, desktop 32px — mockup mobile dùng đệm hẹp để lưới 2 cột vừa
  // màn 390px mà không tràn ngang.
  return (
    <div className={cn("mx-auto w-full max-w-[1360px] px-4 lg:px-8", className)}>{children}</div>
  );
}

/** Đường kẻ mono trên đầu trang: TRANG CHỦ / SẢN PHẨM / … */
export function Crumbs({ parts }: { parts: string[] }) {
  return (
    <nav aria-label="Đường dẫn" className="label-tech mb-5 font-bold">
      {parts.join(" / ")}
    </nav>
  );
}
