import { formatDate } from "@/lib/format";

export type ReviewItem = {
  id: string;
  authorName: string;
  rating: number;
  body: string;
  createdAt: Date;
};

/** Mockup vẽ sao bằng JetBrains Mono màu nhấn, không dùng icon. */
export function Stars({ value }: { value: number }) {
  const full = Math.round(value);
  return (
    <span className="font-mono tracking-[2px] text-accent" aria-hidden>
      {"★".repeat(full) + "☆".repeat(Math.max(0, 5 - full))}
    </span>
  );
}

export function ReviewSection({
  reviews,
  ratingAvg,
  ratingCount,
}: {
  reviews: ReviewItem[];
  ratingAvg: number;
  ratingCount: number;
}) {
  return (
    <section id="danh-gia" className="mt-16 border-t-2 border-divider pt-6">
      <h2 className="mb-6 text-[28px]">Đánh giá từ khách đã mua</h2>

      {ratingCount === 0 ? (
        <p className="border border-dashed border-border-soft bg-subtle px-8 py-14 text-[14px] text-muted">
          Sản phẩm chưa có đánh giá nào. Đánh giá chỉ mở cho khách đã mua hàng.
        </p>
      ) : (
        <div className="grid items-start gap-8 lg:grid-cols-[220px_1fr]">
          <div className="bg-subtle p-6">
            <div className="text-[44px] font-extrabold leading-none tracking-[-0.03em]">
              {ratingAvg.toFixed(1)}
            </div>
            <div className="my-2">
              <Stars value={ratingAvg} />
              <span className="sr-only">{ratingAvg.toFixed(1)} trên 5 sao</span>
            </div>
            <div className="text-[12px] text-muted">{ratingCount} đánh giá đã duyệt</div>
          </div>

          <ul className="border-t border-hairline">
            {reviews.map((r) => (
              <li key={r.id} className="border-b border-hairline py-5">
                <div className="mb-2 flex flex-wrap items-center gap-3">
                  <span className="text-[13.5px] font-extrabold">{r.authorName}</span>
                  <span className="text-[11.5px] text-faint">
                    Đã mua hàng · {formatDate(r.createdAt)}
                  </span>
                  <span className="ml-auto text-[13px]">
                    <Stars value={r.rating} />
                    <span className="sr-only">{r.rating} trên 5 sao</span>
                  </span>
                </div>
                <p className="text-[14px] leading-[1.6]">{r.body}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
