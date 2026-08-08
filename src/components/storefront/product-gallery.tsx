"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import { Photo } from "@/components/ui/photo";

type Shot = { id: string; url: string; alt: string };

/** Ảnh lớn + cột thumbnail 88px. Thumbnail là button nên tab và Enter đều dùng được. */
export function ProductGallery({ images, name }: { images: Shot[]; name: string }) {
  const [active, setActive] = React.useState(0);

  if (images.length === 0) {
    return (
      <div className="flex aspect-[3/4] items-center justify-center bg-subtle text-[13px] text-muted">
        Chưa có ảnh sản phẩm
      </div>
    );
  }

  const current = images[Math.min(active, images.length - 1)];

  return (
    // Mobile: ảnh lớn trên, dải thumbnail cuộn ngang bên dưới.
    // Desktop: cột thumbnail cố định 88px bên trái như mockup.
    <div
      className={cn(
        "flex flex-col-reverse gap-3",
        images.length > 1 && "lg:grid lg:grid-cols-[88px_1fr]",
      )}
    >
      {images.length > 1 ? (
        <div
          className="flex gap-2.5 overflow-x-auto lg:flex-col"
          role="tablist"
          aria-label={"Ảnh " + name}
        >
          {images.map((img, i) => (
            <button
              key={img.id}
              role="tab"
              aria-selected={i === active}
              aria-label={"Xem ảnh " + (i + 1)}
              onClick={() => setActive(i)}
              className={cn(
                "relative block aspect-[3/4] w-[68px] flex-none border-2 bg-subtle lg:w-auto",
                i === active ? "border-divider" : "border-hairline hover:border-faint",
              )}
            >
              <Photo src={img.url} alt="" sizes="(min-width: 1024px) 88px, 68px" />
            </button>
          ))}
        </div>
      ) : null}

      <div className="relative aspect-[3/4] w-full bg-subtle">
        <Photo
          src={current.url}
          alt={current.alt}
          sizes="(min-width: 1024px) 45vw, 100vw"
          priority
        />
      </div>
    </div>
  );
}
