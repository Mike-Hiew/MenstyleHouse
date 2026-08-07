"use client";

import * as React from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { IconButton } from "@/components/ui/button";

/**
 * Ô tìm kiếm mở ra từ icon trên header. Submit bằng form GET nên chạy được cả
 * khi JavaScript chưa tải xong.
 */
export function SearchBox() {
  const [open, setOpen] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  if (!open) {
    return (
      <IconButton aria-label="Tìm kiếm" aria-expanded={false} onClick={() => setOpen(true)}>
        <Search size={18} />
      </IconButton>
    );
  }

  return (
    <form action="/san-pham" method="get" role="search" className="flex items-center gap-1">
      <Input
        ref={inputRef}
        name="q"
        type="search"
        placeholder="Tìm áo phông, jeans…"
        aria-label="Từ khoá tìm kiếm"
        className="h-11 w-56"
        onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
      />
      <IconButton type="submit" aria-label="Tìm">
        <Search size={18} />
      </IconButton>
      <IconButton type="button" aria-label="Đóng tìm kiếm" onClick={() => setOpen(false)}>
        <X size={18} />
      </IconButton>
    </form>
  );
}
