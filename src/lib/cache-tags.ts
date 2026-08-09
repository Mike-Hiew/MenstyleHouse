/**
 * Nhãn cache dùng chung giữa chỗ **đọc** (bọc `unstable_cache`) và chỗ **ghi**
 * (gọi `revalidateTag` sau khi admin sửa).
 *
 * Đặt ở `lib` vì hai phía phải dùng đúng một chuỗi. Gõ tay hai nơi thì một lần
 * gõ lệch là cache không bao giờ được dọn, và admin sửa giá xong ra ngoài cửa
 * hàng vẫn thấy giá cũ — không có gì đỏ, chỉ có khách gọi lên hỏi.
 */
export const TAG = {
  /** Mọi thứ đọc từ catalog: sản phẩm, danh mục, thương hiệu, số đếm bộ lọc. */
  catalog: "catalog",
} as const;
