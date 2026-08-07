import { StarRating } from "./star-rating";
import { formatDate } from "@/lib/format";

export type ReviewItem = {
  id: string;
  authorName: string;
  rating: number;
  body: string;
  createdAt: Date;
};

export function ReviewSection({
  reviews,
  breakdown,
  ratingAvg,
  ratingCount,
}: {
  reviews: ReviewItem[];
  breakdown: { star: number; count: number }[];
  ratingAvg: number;
  ratingCount: number;
}) {
  return (
    <section id="danh-gia" className="border-t-2 border-divider px-6 py-10">
      <h2 className="mb-6 border-b-2 border-divider pb-3 text-[24px]">
        Đánh giá {ratingCount > 0 ? <span className="text-neutral-500">({ratingCount})</span> : null}
      </h2>

      {ratingCount === 0 ? (
        <p className="border-2 border-divider bg-surface px-6 py-16 text-center text-[14px] text-neutral-500">
          Sản phẩm chưa có đánh giá nào. Đánh giá chỉ mở cho khách đã mua hàng.
        </p>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
          <div className="self-start border-2 border-divider bg-surface p-5">
            <div className="mb-1 font-mono text-[40px] font-bold leading-none">
              {ratingAvg.toFixed(1)}
            </div>
            <StarRating value={ratingAvg} size={16} className="mb-1.5" />
            <p className="mb-4 text-[13px] text-neutral-500">{ratingCount} đánh giá đã duyệt</p>

            <div className="flex flex-col gap-1.5">
              {breakdown.map((b) => (
                <div key={b.star} className="flex items-center gap-2 text-[12px]">
                  <span className="w-8 font-mono text-neutral-600">{b.star}★</span>
                  <span className="h-2 flex-1 bg-neutral-200">
                    <span
                      className="block h-full bg-accent"
                      style={{ width: ratingCount ? (b.count / ratingCount) * 100 + "%" : 0 }}
                    />
                  </span>
                  <span className="w-6 text-right font-mono text-neutral-500">{b.count}</span>
                </div>
              ))}
            </div>
          </div>

          <ul className="flex flex-col">
            {reviews.map((r) => (
              <li key={r.id} className="border-b border-hairline py-4 first:pt-0 last:border-b-0">
                <div className="mb-1.5 flex flex-wrap items-center gap-3">
                  <StarRating value={r.rating} size={13} />
                  <span className="text-[14px] font-semibold">{r.authorName}</span>
                  <span className="font-mono text-[12px] text-neutral-500">
                    {formatDate(r.createdAt)}
                  </span>
                </div>
                <p className="text-[14px] text-neutral-700">{r.body}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
