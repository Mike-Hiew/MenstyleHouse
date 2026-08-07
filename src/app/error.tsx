"use client";

import * as React from "react";
import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-[70vh] items-center justify-center px-6 py-20">
      <div className="flex max-w-lg flex-col items-center gap-4 border-2 border-divider bg-surface px-8 py-14 text-center">
        <TriangleAlert size={40} className="text-accent" aria-hidden />
        <h1 className="text-[26px]">Trang gặp sự cố</h1>
        <p className="text-[14px] text-neutral-600">
          Hệ thống không tải được dữ liệu. Bạn thử lại giúp, nếu vẫn lỗi thì gọi
          <span className="font-mono"> 1900 6789</span>.
        </p>
        {error.digest ? (
          <p className="font-mono text-[12px] text-neutral-400">Mã lỗi: {error.digest}</p>
        ) : null}
        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <Button onClick={reset}>Thử lại</Button>
          <Link
            href="/"
            className="inline-flex h-11 items-center border-2 border-divider px-4 text-[14px] font-semibold hover:bg-neutral-200"
          >
            Về trang chủ
          </Link>
        </div>
      </div>
    </main>
  );
}
