# Kiến trúc — Men Style House

## Stack đề xuất

Người dùng chọn "Next.js / React" và "chưa chốt — đề xuất giúp". Đây là đề xuất chốt, tối ưu cho quy mô vài trăm đơn/ngày và một đội nhỏ dùng Claude Code.

| Lớp | Chọn | Lý do |
|---|---|---|
| Framework | **Next.js 15, App Router, TypeScript** | Một codebase cho cả storefront (SEO tốt, SSR) lẫn admin (SPA-like). Server Actions bỏ được nhiều API thủ công. |
| UI | **Tailwind CSS v4** + component tự viết | Modernist rất ít token (không radius, không shadow) → không cần thư viện UI nặng. Dùng shadcn/ui chỉ cho dialog, dropdown, toast rồi bỏ hết bo góc. |
| DB | **PostgreSQL** (Neon hoặc Supabase) | Giao dịch tồn kho cần ACID thật. |
| ORM | **Prisma** | Schema trong `DATA-MODEL.md` viết sẵn cho Prisma. |
| Auth | **Auth.js (NextAuth) v5** — credential + OTP SĐT | Không bắt buộc đăng nhập; guest session bằng cookie riêng. |
| Ảnh | **UploadThing** hoặc **Cloudflare R2** + `next/image` | Ảnh sản phẩm nhiều biến thể, cần biến đổi kích thước. |
| Job nền | **Inngest** hoặc Vercel Cron | Đồng bộ sàn TMĐT, nhắc giỏ bỏ quên, chốt báo cáo ngày. |
| Cache/queue | **Upstash Redis** | Rate limit OTP, khoá tồn kho tạm khi checkout. |
| Deploy | **Vercel** + Neon | Đủ cho quy mô này, không cần tự quản hạ tầng. |

Nếu đội muốn tự chủ hạ tầng trong nước (phù hợp khi tích hợp kế toán và hoá đơn điện tử): Next.js chạy Docker trên VPS Việt Nam + PostgreSQL managed. Kiến trúc code không đổi.

## Cấu trúc thư mục

```
src/
  app/
    (shop)/                 # storefront, layout riêng
      page.tsx              # trang chủ
      san-pham/
      gio-hang/
      thanh-toan/
      don-hang/[code]/
      tra-cuu/
      tai-khoan/
    (auth)/dang-nhap/ dang-ky/
    admin/                  # layout admin, middleware chặn role
      page.tsx
      san-pham/ don-hang/ kho/ hoa-don/ khuyen-mai/ bao-cao/ ho-tro/ cai-dat/
    api/
      webhooks/{vnpay,momo,zalopay,ghn,shopee}/route.ts
  components/
    ui/                     # primitive: Button, Input, Select, Dialog, Table, Badge
    shop/                   # ProductCard, CartLine, CheckoutStepper, RegisterPrompt
    admin/                  # DataTable, CsvExportDialog, StatCard, StatusPill
    print/                  # InvoiceA4, Invoice80mm, GoodsReceiptPrint
  lib/
    db.ts  auth.ts  money.ts  csv.ts  loyalty.ts  inventory.ts
    integrations/{vnpay,momo,zalopay,ghn,ghtk,vtp,otp,misa,shopee}.ts
  server/                   # service layer, không gọi Prisma trực tiếp từ component
    orders.ts products.ts inventory.ts invoices.ts promotions.ts reports.ts
prisma/schema.prisma
```

**Quy tắc:** component không gọi Prisma. Mọi truy vấn đi qua `src/server/*`. Mọi thay đổi tồn kho đi qua `lib/inventory.ts` trong một transaction.

## Những điểm kiến trúc phải làm đúng

### 1. Giỏ hàng cho cả guest lẫn member
Giỏ lưu trong DB, khoá bằng `cartToken` trong cookie `httpOnly` (guest) hoặc `userId` (member). Khi guest đăng nhập/đăng ký giữa chừng, **gộp giỏ** — cùng variant thì cộng số lượng, không ghi đè.

### 2. Tồn kho là nguồn sự thật, không phải con số hiển thị
- `Variant.stock` chỉ được đổi qua `InventoryMovement` (nhập / bán / trả / điều chỉnh / huỷ). Không bao giờ `UPDATE stock` trực tiếp.
- Khi tạo đơn: transaction kiểm tra tồn và trừ trong cùng một lệnh, dùng optimistic lock (`WHERE stock >= qty`). Hết hàng giữa chừng → trả lỗi `OUT_OF_STOCK` kèm danh sách SKU.
- Phiếu nhập kho ở trạng thái `DRAFT` **không** ảnh hưởng tồn. Chỉ khi `POSTED` mới sinh movement. Ghi sổ là một chiều — sửa sai bằng phiếu điều chỉnh, không sửa phiếu cũ.

### 3. Tiền tính bằng số nguyên
Mọi giá trị tiền là `Int` (đơn vị đồng). Không dùng `Float`. Format ở tầng hiển thị bằng `Intl.NumberFormat('vi-VN')`.

### 4. Thứ tự tính đơn hàng (cố định, không đảo)
```
subtotal = Σ(giá bán tại thời điểm đặt × số lượng)
discount = giảm giá khuyến mãi (áp trên subtotal)
shipping = phí vận chuyển theo phương thức
total    = subtotal − discount + shipping
pointsEarned = floor(total / 1000)   // chỉ member
```
Đơn hàng lưu **snapshot** giá, tên sản phẩm, và địa chỉ tại thời điểm đặt. Sửa giá sản phẩm sau này không được làm đổi đơn cũ.

### 5. Idempotency cho webhook thanh toán
Mọi webhook (VNPay/MoMo/ZaloPay/GHN) phải: xác thực chữ ký → tra `WebhookEvent` theo `providerEventId` → nếu đã xử lý thì trả 200 và dừng. Không bao giờ tin `amount` từ client.

### 6. In ấn
Hoá đơn A4 và bill 80mm dựng bằng CSS `@page` + `print` media, render server-side thành route riêng `/admin/hoa-don/[id]/in?kho=a4|80mm`. Không dùng thư viện PDF phía client — máy in nhiệt cần HTML thuần.

## Vai trò & quyền

| Role | Quyền |
|---|---|
| `CUSTOMER` | Storefront, đơn của mình |
| `STAFF` | Đơn hàng, hỗ trợ khách; xem sản phẩm & kho |
| `WAREHOUSE` | Kho, phiếu nhập, ghi sổ |
| `ACCOUNTANT` | Hoá đơn, báo cáo, xuất CSV |
| `ADMIN` | Toàn quyền, cài đặt, khuyến mãi |

Middleware chặn `/admin/*` cho mọi role ngoài 4 role nội bộ. Kiểm quyền chi tiết ở tầng `src/server/*`, không chỉ ở UI.

## Bảo mật & tuân thủ

- OTP: giới hạn 5 lần/SĐT/giờ qua Redis, mã sống 5 phút, hash trước khi lưu.
- Không log số thẻ, không lưu thông tin thẻ — mọi thanh toán redirect sang cổng.
- Mật khẩu: `argon2id`.
- PII (SĐT, địa chỉ) chỉ hiện đầy đủ cho `STAFF` trở lên; log truy cập đơn hàng.
- Xoá tài khoản: ẩn danh hoá khách nhưng giữ đơn hàng cho nghĩa vụ kế toán.
