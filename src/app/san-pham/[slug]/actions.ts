"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  AlreadyReviewedError,
  createReview,
  NotBoughtError,
  reviewSchema,
} from "@/server/reviews";
import { rateLimit } from "@/server/rate-limit";

export type ReviewState = {
  ok?: boolean;
  message?: string;
  errors?: Record<string, string>;
  values?: Record<string, string>;
};

/**
 * Khách gửi đánh giá.
 *
 * Trước M6.13 **không có action nào như thế này** — bảng `Review`, màn duyệt ở
 * admin và khối hiển thị ngoài trang sản phẩm đều có, chỉ thiếu đúng đường để
 * khách gửi vào, nên mọi đánh giá đang thấy đều là dữ liệu mẫu.
 */
export async function guiDanhGiaAction(
  _prev: ReviewState,
  form: FormData,
): Promise<ReviewState> {
  const parsed = reviewSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const i of parsed.error.issues) {
      const k = String(i.path[0] ?? "");
      if (k && !errors[k]) errors[k] = i.message;
    }
    return { ok: false, errors, message: "Kiểm tra lại các ô được đánh dấu.", values: giuLai(form) };
  }

  // Gửi được mà không cần đăng nhập nên phải chặn theo IP.
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!rateLimit("danh-gia:" + ip, 10, 60 * 60 * 1000).ok) {
    return { ok: false, message: "Bạn gửi khá nhiều rồi. Thử lại sau một giờ nhé." };
  }

  try {
    await createReview(parsed.data);
  } catch (e) {
    if (e instanceof NotBoughtError || e instanceof AlreadyReviewedError) {
      return { ok: false, message: e.message, values: giuLai(form) };
    }
    console.error(e);
    return { ok: false, message: "Chưa gửi được đánh giá. Bạn thử lại giúp.", values: giuLai(form) };
  }

  revalidatePath("/san-pham");
  return {
    ok: true,
    message:
      "Cảm ơn bạn. Đánh giá sẽ hiện sau khi cửa hàng duyệt — thường trong một ngày làm việc.",
  };
}

/** Giữ lại những gì đã gõ; React 19 reset form sau mỗi lượt chạy action. */
function giuLai(form: FormData): Record<string, string> {
  const ra: Record<string, string> = {};
  for (const [k, v] of form.entries()) {
    if (typeof v === "string" && k !== "productId") ra[k] = v;
  }
  return ra;
}
