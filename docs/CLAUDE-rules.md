# Men Style House — quy ước dự án

Copy file này vào gốc repo `Mike-Hiew/MenstyleHouse`.

## Bối cảnh
Cửa hàng thời trang nam, storefront + admin, quy mô vài trăm đơn/ngày. Giao diện **hoàn toàn tiếng Việt**. Tài liệu thiết kế và nghiệp vụ nằm trong `docs/handoff/`.

## Stack
Next.js 15 (App Router, TypeScript) · Tailwind v4 · PostgreSQL + Prisma · Auth.js v5 · Vercel.

## Hệ thiết kế — hai bộ token

Token đầy đủ: `docs/TOKENS.md`.

**Storefront — v2 "borderless editorial".** Khối tách nhau bằng khoảng trắng, tông nền
và bóng mềm (`shadow-soft` / `shadow-raised`), **không kẻ viền**. Ảnh/thẻ `rounded-card`
(24px), panel `rounded-panel` (32px), nút · chip · ô nhập `rounded-full`. Ô nhập nền đặc
`bg-field`, focus nền trắng + vòng `ring-ring`. Đỏ `#E8341A` chỉ cho nút chính và giá sale.
Archivo variable (trục `wdth`); JetBrains Mono chỉ cho mã sản phẩm / SKU / mã đơn.

**Admin — Modernist** (bọc trong `.theme-modernist`). Phẳng, tương phản cao:
`border-radius: 0`, không `box-shadow`, phân tầng bằng viền và nền. Ảnh sản phẩm
`grayscale(1) contrast(1.08)`. Nhãn kỹ thuật mono, viết hoa.

Viết class dùng chung cho cả hai bằng token (ví dụ `border-2 border-divider bg-field`) —
đừng viết màu hay bo góc cứng trong `components/ui/*`, vì admin cũng dùng chúng.

## Quy tắc code

- Component **không** gọi Prisma. Mọi truy vấn qua `src/server/*`.
- Tiền là `Int` (đồng). Không `Float`. Format bằng `Intl.NumberFormat('vi-VN')`.
- `Variant.stock` chỉ đổi qua `lib/inventory.ts`, luôn kèm `InventoryMovement` trong cùng transaction.
- `Order` snapshot giá, tên sản phẩm, địa chỉ — không tham chiếu bản ghi sống.
- Kiểm tra dữ liệu bằng Zod ở server, kể cả khi client đã kiểm.
- Chuyển trạng thái đơn kiểm ở server, không chỉ ẩn nút ở UI.
- Webhook: xác thực chữ ký → chống trùng qua `WebhookEvent` → xử lý.
- Không commit khoá API. Cập nhật `.env.example` khi thêm biến mới.

## Nghiệp vụ dễ làm sai

- **Guest mua được toàn bộ luồng**, không bắt đăng nhập. Guest không tích điểm, không lưu địa chỉ, tra cứu đơn bằng mã + SĐT.
- **Member** tích 1 điểm / 1.000đ, chỉ khi đơn `PAID` **và** `DELIVERED`.
- Popup mời đăng ký: một lần mỗi phiên, tự tắt sau 15 giây, có nút "Để sau" rõ ràng.
- Phiếu nhập kho `DRAFT` không ảnh hưởng tồn. **Ghi sổ là một chiều** — sai thì lập phiếu điều chỉnh, không sửa phiếu cũ.
- CSV xuất cho Excel bản Việt phải có BOM `\uFEFF`.

## Văn phong nội dung
Ngắn, cụ thể, có số liệu thật (trọng lượng vải, khoảng cân nặng theo size, số ngày đổi trả). Không lời sáo rỗng, không emoji.

## Lệnh
```bash
pnpm dev            # chạy dev
pnpm db:push        # đồng bộ schema
pnpm db:seed        # nạp dữ liệu mẫu
pnpm test           # kèm test bất biến tồn kho — bắt buộc xanh trước khi merge
```
