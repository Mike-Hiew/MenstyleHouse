"use client";

import * as React from "react";
import { useActionState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/cn";
import { Field, Input } from "@/components/ui/input";
import { guiDanhGiaAction, type ReviewState } from "@/app/san-pham/[slug]/actions";

/**
 * Form viết đánh giá.
 *
 * Mặc định **gập lại**: khối đánh giá là chỗ để đọc, không phải chỗ để điền.
 * Bày sẵn một form dài giữa trang sản phẩm đẩy hết đánh giá thật xuống dưới.
 *
 * Có nói thẳng "chỉ khách đã mua mới gửi được" ngay từ đầu, thay vì để người ta
 * gõ xong một đoạn dài rồi mới báo là không đủ điều kiện.
 */
export function ReviewForm({ productId }: { productId: string }) {
  const [mo, setMo] = React.useState(false);
  const [sao, setSao] = React.useState(5);
  const [state, gui, pending] = useActionState<ReviewState, FormData>(guiDanhGiaAction, {});

  if (state.ok) {
    return (
      <p
        role="status"
        className="mt-6 border-2 border-divider bg-surface px-5 py-4 text-[14px] font-semibold"
      >
        {state.message}
      </p>
    );
  }

  if (!mo) {
    return (
      <button
        type="button"
        onClick={() => setMo(true)}
        className="mt-6 flex h-12 items-center border-2 border-divider px-6 text-[14px] font-extrabold"
      >
        VIẾT ĐÁNH GIÁ
      </button>
    );
  }

  return (
    <form action={gui} className="mt-6 grid max-w-[640px] gap-4 border-2 border-divider p-5 sm:grid-cols-2">
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="rating" value={sao} />

      <p className="text-[13px] leading-[1.6] text-muted sm:col-span-2">
        Chỉ khách đã mua mới đánh giá được. Nhập số điện thoại đã dùng khi đặt hàng để cửa hàng
        đối chiếu.
      </p>

      {state.message ? (
        <p
          role="alert"
          className="border-2 border-accent bg-accent-100 px-4 py-3 text-[14px] font-semibold text-accent-800 sm:col-span-2"
        >
          {state.message}
        </p>
      ) : null}

      <div className="sm:col-span-2">
        <span className="label-tech mb-2 block font-bold">CHẤM ĐIỂM</span>
        <div className="flex gap-1" role="radiogroup" aria-label="Số sao">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={sao === n}
              aria-label={n + " sao"}
              onClick={() => setSao(n)}
              className={cn(
                "flex h-11 w-11 items-center justify-center border",
                n <= sao ? "border-accent bg-accent-100 text-accent" : "border-hairline text-neutral-400",
              )}
            >
              <Star size={18} fill={n <= sao ? "currentColor" : "none"} aria-hidden />
            </button>
          ))}
        </div>
      </div>

      <Field label="Tên của bạn" required error={state.errors?.authorName}>
        <Input name="authorName" defaultValue={state.values?.authorName ?? ""} autoComplete="name" />
      </Field>

      <Field
        label="Số điện thoại đã đặt hàng"
        required
        error={state.errors?.phone}
        hint="Chỉ dùng để đối chiếu, không hiện công khai"
      >
        <Input
          name="phone"
          defaultValue={state.values?.phone ?? ""}
          inputMode="numeric"
          autoComplete="tel"
        />
      </Field>

      <div className="sm:col-span-2">
        <Field
          label="Cảm nhận của bạn"
          required
          error={state.errors?.body}
          hint="Form, chất vải, có đúng size không — thứ người sau cần biết"
        >
          <textarea
            name="body"
            rows={4}
            defaultValue={state.values?.body ?? ""}
            className="w-full border border-border-soft bg-surface px-3 py-2.5 text-[15px] outline-none focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent lg:text-[14px]"
          />
        </Field>
      </div>

      <div className="flex flex-wrap gap-3 sm:col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="flex h-12 items-center bg-accent px-7 text-[14px] font-extrabold text-bg disabled:opacity-60"
        >
          {pending ? "Đang gửi…" : "GỬI ĐÁNH GIÁ"}
        </button>
        <button
          type="button"
          onClick={() => setMo(false)}
          className="flex h-12 items-center border-2 border-divider px-6 text-[14px] font-extrabold"
        >
          Thôi
        </button>
      </div>
    </form>
  );
}
