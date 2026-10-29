"use client";

import * as React from "react";
import { useActionState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/cn";
import { danhGiaAction, type DanhGiaState } from "@/app/ho-tro/tra-cuu/actions";

const NHAN = ["Rất không hài lòng", "Không hài lòng", "Bình thường", "Hài lòng", "Rất hài lòng"];

/**
 * Khách chấm mức hài lòng sau khi cửa hàng đã trả lời.
 *
 * Năm sao là một nhóm `radio` thật (ẩn ô tròn, hiện ngôi sao): bàn phím đi bằng
 * mũi tên, trình đọc màn hình đọc "4 sao, Hài lòng" — không phải năm nút rời
 * không ai biết đang chọn cái nào.
 */
export function TicketRating({
  code,
  rated,
}: {
  code: string;
  /** Đã chấm rồi thì chỉ hiện lại kết quả. */
  rated: { rating: number; note: string | null } | null;
}) {
  const [state, gui, pending] = useActionState<DanhGiaState, FormData>(danhGiaAction, {});
  const [chon, setChon] = React.useState(0);
  const [hover, setHover] = React.useState(0);

  if (rated) {
    return (
      <div className="mt-6 rounded-card bg-surface px-5 py-4 shadow-soft">
        <p className="label-tech mb-1.5 font-bold">ĐÁNH GIÁ CỦA BẠN</p>
        <Sao n={rated.rating} />
        <p className="mt-1 text-[13.5px] text-muted">
          {rated.rating}/5 · {NHAN[rated.rating - 1]}. Cảm ơn bạn đã góp ý.
        </p>
        {rated.note ? <p className="mt-2 text-[14px] italic">“{rated.note}”</p> : null}
      </div>
    );
  }

  if (state.ok) {
    return (
      <p role="status" className="mt-6 rounded-card bg-surface px-5 py-4 text-[14px] font-semibold shadow-soft">
        {state.message}
      </p>
    );
  }

  const hien = hover || chon;

  return (
    <form action={gui} className="mt-6 grid gap-3.5 rounded-card bg-surface p-5 shadow-soft">
      <input type="hidden" name="code" value={code} />
      <fieldset>
        <legend className="mb-1 text-[15px] font-extrabold">Bạn hài lòng với phản hồi của cửa hàng chứ?</legend>
        <p className="mb-3 text-[13px] text-muted">Chấm một lần, giúp cửa hàng biết mình đang làm tốt chỗ nào.</p>
        <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
          {NHAN.map((nhan, i) => {
            const n = i + 1;
            return (
              <label
                key={n}
                onMouseEnter={() => setHover(n)}
                className="grid h-11 w-11 cursor-pointer place-items-center rounded-full has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent"
              >
                <input
                  type="radio"
                  name="rating"
                  value={n}
                  checked={chon === n}
                  onChange={() => setChon(n)}
                  aria-label={`${n} sao, ${nhan}`}
                  className="sr-only"
                />
                <Star
                  size={28}
                  aria-hidden
                  className={cn(
                    "transition-[color,fill,transform] duration-150",
                    n <= hien ? "fill-accent text-accent" : "fill-transparent text-stone",
                    n === hover && "scale-110",
                  )}
                />
              </label>
            );
          })}
          <span className="ml-2 min-h-5 text-[13.5px] font-semibold text-muted" aria-hidden>
            {hien ? NHAN[hien - 1] : ""}
          </span>
        </div>
      </fieldset>

      {chon ? (
        <label className="grid gap-1.5">
          <span className="text-[12.5px] font-semibold text-neutral-600">Góp ý thêm (không bắt buộc)</span>
          <textarea
            name="note"
            rows={3}
            maxLength={500}
            className="w-full rounded-2xl bg-field px-4 py-2.5 text-[15px] outline-none transition-[background-color,box-shadow] focus:bg-surface focus:ring-4 focus:ring-ring lg:text-[14px]"
          />
        </label>
      ) : null}

      {state.message ? (
        <p role="alert" className="rounded-2xl bg-accent-100 px-4 py-3 text-[14px] font-semibold text-accent-800">
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending || !chon}
        className="flex h-12 w-fit items-center justify-center rounded-full bg-neutral-900 px-7 text-[14px] font-semibold text-bg transition-opacity disabled:opacity-40"
      >
        {pending ? "Đang gửi…" : "GỬI ĐÁNH GIÁ"}
      </button>
    </form>
  );
}

/** Hàng sao tĩnh để hiện lại điểm đã chấm. */
export function Sao({ n, size = 18 }: { n: number; size?: number }) {
  return (
    <span className="inline-flex gap-0.5" role="img" aria-label={`${n} trên 5 sao`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          aria-hidden
          className={i <= n ? "fill-accent text-accent" : "fill-transparent text-stone"}
        />
      ))}
    </span>
  );
}
