import { Star } from "lucide-react";
import { cn } from "@/lib/cn";

/** Sao đặc theo điểm trung bình làm tròn 0,5 — nửa sao vẽ bằng lớp phủ. */
export function StarRating({
  value,
  count,
  size = 14,
  className,
}: {
  value: number;
  count?: number;
  size?: number;
  className?: string;
}) {
  const rounded = Math.round(value * 2) / 2;

  return (
    <div
      className={cn("flex items-center gap-1.5", className)}
      title={value > 0 ? value.toFixed(1) + " trên 5" : "Chưa có đánh giá"}
    >
      <div className="flex" aria-hidden>
        {[1, 2, 3, 4, 5].map((i) => {
          const fill = Math.min(1, Math.max(0, rounded - i + 1));
          return (
            <span key={i} className="relative block" style={{ width: size, height: size }}>
              <Star size={size} className="absolute inset-0 text-neutral-300" strokeWidth={2} />
              {fill > 0 ? (
                <span
                  className="absolute inset-0 overflow-hidden"
                  style={{ width: size * fill }}
                >
                  <Star size={size} className="text-accent" fill="currentColor" strokeWidth={2} />
                </span>
              ) : null}
            </span>
          );
        })}
      </div>
      <span className="sr-only">
        {value > 0 ? value.toFixed(1) + " trên 5 sao" : "Chưa có đánh giá"}
      </span>
      {count !== undefined ? (
        <span className="font-mono text-[12px] text-neutral-500">({count})</span>
      ) : null}
    </div>
  );
}
