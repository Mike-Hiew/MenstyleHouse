# API & Server Actions — Men Style House

Next.js App Router: thao tác từ form dùng **Server Actions**; những thứ cần gọi từ ngoài (webhook, sàn TMĐT, app) dùng **Route Handlers** dưới `/api`. Bảng dưới ghi cả hai.

Định dạng lỗi thống nhất:
```json
{ "error": { "code": "OUT_OF_STOCK", "message": "Áo phông Basic — Đen / L chỉ còn 2 sản phẩm", "details": { "sku": "MSH-TS01-BK-L", "available": 2 } } }
```

Mã lỗi dùng chung: `VALIDATION_ERROR` · `UNAUTHENTICATED` · `FORBIDDEN` · `NOT_FOUND` · `OUT_OF_STOCK` · `COUPON_INVALID` · `PAYMENT_FAILED` · `RATE_LIMITED` · `RECEIPT_ALREADY_POSTED` · `CONFLICT`

---

## Storefront

### Sản phẩm
| Thao tác | Chữ ký | Ghi chú |
|---|---|---|
| Danh sách | `GET /api/products?category=&brand[]=&size[]=&priceMax=&sort=&page=` | `sort`: `new` `price_asc` `price_desc` `bestseller`. Trả `{items, total, facets}` — `facets` để hiện số đếm cạnh mỗi bộ lọc. |
| Chi tiết | `GET /api/products/[slug]` | Kèm `variants`, `images`, `reviews` (đã duyệt), `relatedProducts`. |
| Đánh giá | `createReview(productId, rating, body, images)` | Chỉ nhận nếu SĐT có đơn `DELIVERED` chứa sản phẩm. Vào hàng chờ duyệt. |

### Giỏ hàng
| Thao tác | Chữ ký |
|---|---|
| Lấy giỏ | `getCart()` — đọc cookie `cartToken` hoặc session |
| Thêm | `addToCart(variantId, qty)` — kiểm tồn, gộp nếu đã có |
| Đổi số lượng | `updateCartItem(itemId, qty)` — `qty = 0` là xoá |
| Xoá | `removeCartItem(itemId)` |
| Áp mã | `applyCoupon(code)` → `{discount, message}` hoặc `COUPON_INVALID` |
| Gộp khi đăng nhập | `mergeGuestCart(cartToken, userId)` — cộng qty, không ghi đè |

### Checkout (3 bước)
| Bước | Chữ ký | Ghi chú |
|---|---|---|
| 1. Thông tin | `saveCheckoutContact(payload)` | Member: chọn `addressId` hoặc nhập mới. Guest: bắt buộc `receiver, phone, province, district, ward, street`. Tuỳ chọn tạo tài khoản kèm. |
| 2. Vận chuyển | `getShippingQuotes(addressPayload, cartId)` | Gọi song song GHN/GHTK/VTP, trả `[{carrier, name, fee, etaText}]`. Timeout 3s/hãng, hãng nào lỗi thì ẩn. |
| 3. Thanh toán | `placeOrder(payload)` | Transaction: kiểm + trừ tồn → tạo `Order` + `OrderItem` snapshot → tăng `usedCount` coupon → tạo `Payment`. COD trả `{orderCode}`; cổng online trả `{redirectUrl}`. |

**`placeOrder` phải idempotent** — nhận `idempotencyKey` từ client, gọi lại cùng key trả về đúng đơn cũ.

### Đơn hàng & tài khoản
| Thao tác | Chữ ký |
|---|---|
| Xem đơn (member) | `GET /api/orders` |
| Xem đơn (mã) | `GET /api/orders/[code]?phone=<4 số cuối>` — rate limit 10/IP/giờ |

> IP dùng làm khoá rate limit lấy từ `docIpKhach()`, **không** phải phần tử đầu
> của `X-Forwarded-For` — xem `docs/ARCHITECTURE.md`. Chạy sau proxy thì phải
> khai `TRUSTED_PROXY_HOPS`, không khai thì mọi khách chung một bộ đếm.
| Huỷ đơn | `cancelOrder(code)` — chỉ khi `status ∈ {PENDING, CONFIRMED}`; hoàn tồn + hoàn điểm |
| Sổ địa chỉ | `listAddresses()` `saveAddress()` `deleteAddress()` `setDefaultAddress()` |
| Điểm thưởng | `GET /api/loyalty` → `{balance, entries[]}` |

### Xác thực
| Thao tác | Chữ ký | Ghi chú |
|---|---|---|
| Gửi OTP | `POST /api/auth/otp/send {phone}` | 5 lần/SĐT/giờ, mã 6 số, sống 5 phút |
| Xác thực OTP | `POST /api/auth/otp/verify {phone, code}` | Sai 5 lần thì huỷ mã |
| Đăng ký | `register({name, phone, email?, password?})` | Đăng ký xong tự gộp giỏ guest |
| Đăng nhập | Auth.js credentials + OTP provider |

---

## Admin

Tất cả yêu cầu role nội bộ. Bảng dùng chung tham số phân trang `?page=&perPage=&q=&sort=`.

### Sản phẩm
```
GET    /api/admin/products              danh sách + lọc
POST   /api/admin/products              tạo
PATCH  /api/admin/products/[id]         sửa thông tin
POST   /api/admin/products/[id]/variants        thêm biến thể
PATCH  /api/admin/variants/[id]                 sửa giá / ngưỡng cảnh báo (KHÔNG sửa stock)
POST   /api/admin/products/[id]/images          upload, sắp xếp
```

### Đơn hàng
```
GET    /api/admin/orders?status=&from=&to=
GET    /api/admin/orders/[id]
POST   /api/admin/orders/[id]/status    { status, note } → ghi OrderEvent
POST   /api/admin/orders/[id]/ship      { carrier } → tạo vận đơn, lưu trackingCode
POST   /api/admin/orders/[id]/refund    { amount, reason } → hoàn tiền + hoàn tồn + trừ điểm
```
Chuyển trạng thái hợp lệ: `PENDING → CONFIRMED → PACKING → SHIPPING → DELIVERED`; `CANCELLED` từ bất kỳ trạng thái trước `SHIPPING`; `RETURNED` chỉ từ `DELIVERED`. Chặn ở server, không chỉ ở UI.

### Kho & phiếu nhập
```
GET    /api/admin/inventory?lowStock=true       tồn theo SKU
POST   /api/admin/receipts                      tạo phiếu (DRAFT)
PATCH  /api/admin/receipts/[id]                 sửa dòng hàng — chỉ khi DRAFT
POST   /api/admin/receipts/[id]/post            GHI SỔ — một chiều, sinh movement, cộng tồn
POST   /api/admin/receipts/[id]/cancel          huỷ — chỉ khi DRAFT
GET    /api/admin/receipts/[id]/print           bản in phiếu
POST   /api/admin/inventory/adjust              { variantId, delta, note } → movement ADJUST
```
`POST /post` trả `RECEIPT_ALREADY_POSTED` nếu gọi lần hai.

### Hoá đơn
```
GET  /api/admin/invoices
POST /api/admin/invoices                { orderId, buyerName, buyerTax?, buyerAddr }
GET  /api/admin/invoices/[id]/print?format=a4|80mm
POST /api/admin/invoices/[id]/e-invoice   phát hành hoá đơn điện tử → lưu eInvoiceId
```

### Khuyến mãi, báo cáo, hỗ trợ
```
GET/POST/PATCH /api/admin/coupons
GET  /api/admin/reports/revenue?from=&to=&groupBy=day|week|month
GET  /api/admin/reports/top-products?from=&to=&limit=
GET/POST /api/admin/tickets, /api/admin/tickets/[id]/messages
```

### Xuất CSV — endpoint dùng chung
```
POST /api/admin/export
{
  "table": "orders" | "products" | "inventory" | "invoices" | "customers",
  "scope": "page" | "filtered" | "all",
  "filters": { ... },          // y hệt filter đang áp trên bảng
  "columns": ["code", "customer", "total"],
  "encoding": "utf8" | "utf8-bom" | "tsv",
  "separator": "," | ";" | "\t",
  "includeHeader": true
}
```
Trả stream `text/csv` với `Content-Disposition: attachment; filename="msh-<table>-<yyyymmdd>.csv"`.

Lưu ý: `utf8-bom` phải prepend `\uFEFF` để Excel bản Việt mở không lỗi font — đây là lựa chọn mặc định người dùng hay cần. Escape ô chứa dấu phân tách hoặc xuống dòng bằng dấu nháy kép, nhân đôi nháy kép bên trong. `scope: "all"` phải stream theo cursor, không load hết vào RAM.

---

## Webhook (nhận từ bên ngoài)

```
POST /api/webhooks/vnpay      POST /api/webhooks/momo      POST /api/webhooks/zalopay
POST /api/webhooks/ghn        POST /api/webhooks/ghtk      POST /api/webhooks/shopee
```
Mọi handler theo đúng trình tự: **xác thực chữ ký → ghi `WebhookEvent` (unique `provider + providerEventId`) → nếu đã `processedAt` thì trả 200 và dừng → xử lý → set `processedAt`**. Không tin `amount` từ payload; luôn đối chiếu với `Order.total` trong DB trước khi đánh dấu `PAID`.
