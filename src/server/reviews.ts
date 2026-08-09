import "server-only";
import { z } from "zod";
import { db } from "@/lib/db";

/**
 * Khách viết đánh giá sản phẩm.
 *
 * Trước đây bảng `Review`, màn duyệt ở admin và khối hiển thị ngoài trang sản
 * phẩm đều đã có — **chỉ thiếu đúng đường để khách gửi vào**, nên mọi đánh giá
 * đang thấy đều là dữ liệu mẫu.
 *
 * Hai luật:
 *
 * 1. **Chỉ người đã mua mới được đánh giá.** Kiểm bằng số điện thoại đặt hàng:
 *    phải có một đơn `DELIVERED` chứa đúng sản phẩm này. Không kiểm thì trang
 *    sản phẩm thành bảng tin ai viết gì cũng được, và mấy con số 4.8/5 ngoài
 *    trang chủ mất sạch ý nghĩa.
 * 2. **Vào hàng chờ duyệt, không hiện ngay.** `approved` mặc định `false`; màn
 *    duyệt ở admin đã có sẵn.
 */

export const reviewSchema = z.object({
  productId: z.string().min(1),
  /** Số điện thoại đã dùng để đặt đơn — dùng để chứng minh đã mua. */
  phone: z
    .string()
    .trim()
    .regex(/^0\d{9}$/, "Nhập số điện thoại đã dùng khi đặt hàng"),
  authorName: z.string().trim().min(2, "Nhập tên của bạn").max(60),
  rating: z.coerce.number().int().min(1, "Chọn số sao").max(5),
  body: z
    .string()
    .trim()
    .min(20, "Viết giúp ít nhất 20 ký tự để người sau đọc còn hiểu")
    .max(1500),
});

export type ReviewInput = z.infer<typeof reviewSchema>;

export class NotBoughtError extends Error {
  constructor() {
    super(
      "Số điện thoại này chưa có đơn đã giao nào chứa sản phẩm. " +
        "Chỉ người đã mua mới đánh giá được.",
    );
    this.name = "NotBoughtError";
  }
}

export class AlreadyReviewedError extends Error {
  constructor() {
    super("Số điện thoại này đã đánh giá sản phẩm rồi. Cảm ơn bạn.");
    this.name = "AlreadyReviewedError";
  }
}

/**
 * Đơn đã giao gần nhất của số điện thoại này có chứa sản phẩm không.
 *
 * `OrderItem` chỉ giữ `variantId` dạng chuỗi, **không có quan hệ tới `Variant`**
 * (dòng đơn là bản chụp tại thời điểm mua, cố ý không phụ thuộc dữ liệu sống),
 * nên phải lấy danh sách biến thể của sản phẩm trước rồi mới đối chiếu.
 */
async function donDaMua(productId: string, phone: string) {
  const bien = await db.variant.findMany({ where: { productId }, select: { id: true } });
  if (bien.length === 0) return null;

  return db.order.findFirst({
    where: {
      phone,
      status: "DELIVERED",
      items: { some: { variantId: { in: bien.map((v) => v.id) } } },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
}


export async function createReview(input: ReviewInput): Promise<{ id: string }> {
  const don = await donDaMua(input.productId, input.phone);
  if (!don) throw new NotBoughtError();

  // Một đơn một đánh giá: chặn spam mà không cần tài khoản.
  const daCo = await db.review.findFirst({
    where: { productId: input.productId, orderId: don.id },
    select: { id: true },
  });
  if (daCo) throw new AlreadyReviewedError();

  const r = await db.review.create({
    data: {
      productId: input.productId,
      orderId: don.id,
      authorName: input.authorName,
      rating: input.rating,
      body: input.body,
      imageUrls: [],
      approved: false,
    },
    select: { id: true },
  });

  return r;
}
