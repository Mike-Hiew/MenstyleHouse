"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

type Shot = { id: string; url: string; alt: string };

/** Ảnh lớn + dải thumbnail. Thumbnail là button nên tab và Enter đều dùng được. */
export function ProductGallery({ images, name }: { images: Shot[]; name: string }) {
  const [active, setActive] = React.useState(0);

  if (images.length === 0) {
    return (
      <div className="flex aspect-[3/4] items-center justify-center border-2 border-divider bg-neutral-200 text-[13px] text-neutral-500">
        Chưa có ảnh sản phẩm
      </div>
    );
  }

  const current = images[Math.min(active, images.length - 1)];

  return (
    // Chặn bề rộng: ảnh 3/4 trên cột rộng sẽ cao hơn màn hình và đẩy cột thông tin trống.
    <div className="flex w-full max-w-[620px] gap-3">
      {images.length > 1 ? (
        <div className="flex w-20 shrink-0 flex-col gap-2" role="tablist" aria-label={"Ảnh " + name}>
          {images.map((img, i) => (
            <button
              key={img.id}
              role="tab"
              aria-selected={i === active}
              aria-label={"Ảnh " + (i + 1)}
              onClick={() => setActive(i)}
              className={cn(
                "aspect-[3/4] border-2 bg-neutral-200 grayscale-photo",
                i === active ? "border-accent" : "border-divider hover:border-neutral-500",
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      ) : null}

      <div className="min-w-0 flex-1 border-2 border-divider bg-neutral-200">
        <div className="aspect-[3/4] grayscale-photo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={current.url}
            alt={current.alt}
            className="h-full w-full object-cover"
            fetchPriority="high"
          />
        </div>
      </div>
    </div>
  );
}
