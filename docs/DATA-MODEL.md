# Mô hình dữ liệu — Men Style House

Schema Prisma. Tiền tệ là `Int` (đồng). Thời gian UTC, hiển thị theo `Asia/Ho_Chi_Minh`.

```prisma
generator client { provider = "prisma-client-js" }
datasource db { provider = "postgresql"; url = env("DATABASE_URL") }

// ─── Người dùng ──────────────────────────────────────────────
enum Role { CUSTOMER STAFF WAREHOUSE ACCOUNTANT ADMIN }

model User {
  id           String   @id @default(cuid())
  email        String?  @unique
  phone        String?  @unique
  phoneVerified Boolean @default(false)
  passwordHash String?
  name         String
  role         Role     @default(CUSTOMER)
  pointBalance Int      @default(0)
  createdAt    DateTime @default(now())
  addresses    Address[]
  orders       Order[]
  pointEntries PointEntry[]
  carts        Cart[]
  tickets      Ticket[]
}

model Address {
  id        String  @id @default(cuid())
  userId    String
  user      User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  label     String            // "Nhà riêng", "Công ty"
  receiver  String
  phone     String
  province  String
  district  String
  ward      String
  street    String
  isDefault Boolean @default(false)
  @@index([userId])
}

// Điểm thưởng — chỉ member. 1 điểm / 1.000đ trên tổng thanh toán.
enum PointReason { EARN_ORDER REDEEM_ORDER ADJUST EXPIRE REFUND }

model PointEntry {
  id        String      @id @default(cuid())
  userId    String
  user      User        @relation(fields: [userId], references: [id])
  delta     Int                          // + tích, − dùng
  reason    PointReason
  orderId   String?
  note      String?
  createdAt DateTime    @default(now())
  @@index([userId, createdAt])
}

// ─── Danh mục sản phẩm ───────────────────────────────────────
model Category {
  id       String    @id @default(cuid())
  name     String                        // "Áo phông", "Jeans"…
  slug     String    @unique
  sort     Int       @default(0)
  products Product[]
}

model Brand {
  id       String    @id @default(cuid())
  name     String    @unique
  products Product[]
}

enum ProductStatus { DRAFT ACTIVE ARCHIVED }

model Product {
  id          String        @id @default(cuid())
  name        String
  slug        String        @unique
  description String        @db.Text
  categoryId  String
  category    Category      @relation(fields: [categoryId], references: [id])
  brandId     String?
  brand       Brand?        @relation(fields: [brandId], references: [id])
  basePrice   Int                          // giá niêm yết, đồng
  salePrice   Int?                         // giá sau giảm; null = không sale
  status      ProductStatus @default(DRAFT)
  material    String?                      // "Cotton 250gsm"
  careNote    String?
  ratingAvg   Float         @default(0)
  ratingCount Int           @default(0)
  images      ProductImage[]
  variants    Variant[]
  reviews     Review[]
  createdAt   DateTime      @default(now())
  @@index([categoryId, status])
}

model ProductImage {
  id        String  @id @default(cuid())
  productId String
  product   Product @relation(fields: [productId], references: [id], onDelete: Cascade)
  url       String
  alt       String
  sort      Int     @default(0)
}

// Biến thể = màu × size. SKU là mã duy nhất, hiện khắp kho và phiếu nhập.
model Variant {
  id         String    @id @default(cuid())
  productId  String
  product    Product   @relation(fields: [productId], references: [id], onDelete: Cascade)
  sku        String    @unique
  color      String
  colorHex   String
  size       String                        // S M L XL XXL, hoặc 29–36 cho quần
  stock      Int       @default(0)         // CHỈ đổi qua InventoryMovement
  lowStockAt Int       @default(10)        // ngưỡng cảnh báo
  priceDelta Int       @default(0)         // cộng vào giá sản phẩm nếu size lớn
  barcode    String?
  movements  InventoryMovement[]
  @@unique([productId, color, size])
  @@index([stock])
}

// ─── Giỏ hàng ────────────────────────────────────────────────
model Cart {
  id        String     @id @default(cuid())
  token     String     @unique              // cookie httpOnly cho guest
  userId    String?
  user      User?      @relation(fields: [userId], references: [id])
  items     CartItem[]
  couponId  String?
  updatedAt DateTime   @updatedAt
}

model CartItem {
  id        String  @id @default(cuid())
  cartId    String
  cart      Cart    @relation(fields: [cartId], references: [id], onDelete: Cascade)
  variantId String
  qty       Int
  @@unique([cartId, variantId])
}

// ─── Đơn hàng ────────────────────────────────────────────────
enum OrderStatus { PENDING CONFIRMED PACKING SHIPPING DELIVERED CANCELLED RETURNED }
enum PaymentStatus { UNPAID PAID REFUNDED PARTIAL_REFUND FAILED }
enum PaymentMethod { COD VNPAY MOMO ZALOPAY BANK_TRANSFER }
enum Carrier { GHN GHTK VIETTEL_POST STORE_PICKUP }

model Order {
  id            String        @id @default(cuid())
  code          String        @unique       // MSH-2026-00148, hiển thị cho khách
  userId        String?                     // null = khách vãng lai
  user          User?         @relation(fields: [userId], references: [id])
  isGuest       Boolean       @default(true)

  // snapshot thông tin nhận hàng — KHÔNG tham chiếu Address
  receiver      String
  phone         String
  email         String?
  province      String
  district      String
  ward          String
  street        String
  note          String?

  status        OrderStatus   @default(PENDING)
  paymentStatus PaymentStatus @default(UNPAID)
  paymentMethod PaymentMethod
  carrier       Carrier?
  trackingCode  String?

  subtotal      Int
  discount      Int           @default(0)
  shippingFee   Int           @default(0)
  total         Int
  pointsEarned  Int           @default(0)
  pointsUsed    Int           @default(0)

  couponCode    String?
  items         OrderItem[]
  events        OrderEvent[]
  invoice       Invoice?
  payments      Payment[]
  createdAt     DateTime      @default(now())
  @@index([status, createdAt])
  @@index([phone])                          // tra cứu đơn cho guest
}

// Snapshot toàn bộ — sửa sản phẩm sau này không đổi đơn cũ.
model OrderItem {
  id          String @id @default(cuid())
  orderId     String
  order       Order  @relation(fields: [orderId], references: [id], onDelete: Cascade)
  variantId   String
  sku         String
  productName String
  color       String
  size        String
  imageUrl    String?
  unitPrice   Int
  qty         Int
  lineTotal   Int
}

model OrderEvent {
  id        String      @id @default(cuid())
  orderId   String
  order     Order       @relation(fields: [orderId], references: [id], onDelete: Cascade)
  status    OrderStatus
  note      String?
  actorName String?
  createdAt DateTime    @default(now())
  @@index([orderId, createdAt])
}

model Payment {
  id            String        @id @default(cuid())
  orderId       String
  order         Order         @relation(fields: [orderId], references: [id])
  method        PaymentMethod
  amount        Int
  status        PaymentStatus
  providerTxnId String?       @unique
  rawPayload    Json?
  paidAt        DateTime?
  createdAt     DateTime      @default(now())
}

// ─── Hoá đơn GTGT ────────────────────────────────────────────
model Invoice {
  id         String   @id @default(cuid())
  orderId    String   @unique
  order      Order    @relation(fields: [orderId], references: [id])
  number     String   @unique              // HD-2026-00148
  buyerName  String
  buyerTax   String?                       // MST công ty
  buyerAddr  String
  vatRate    Int      @default(8)          // %
  netAmount  Int
  vatAmount  Int
  grossAmount Int
  issuedAt   DateTime @default(now())
  eInvoiceId String?                       // mã tra cứu hoá đơn điện tử
}

// ─── Kho ─────────────────────────────────────────────────────
model Warehouse {
  id       String @id @default(cuid())
  name     String                          // "Kho Tân Bình"
  address  String
  receipts GoodsReceipt[]
}

model Supplier {
  id       String @id @default(cuid())
  name     String
  phone    String?
  taxCode  String?
  receipts GoodsReceipt[]
}

enum ReceiptStatus { DRAFT POSTED CANCELLED }

// Phiếu nhập kho. DRAFT không ảnh hưởng tồn; POSTED sinh movement, không sửa được.
model GoodsReceipt {
  id          String        @id @default(cuid())
  code        String        @unique        // PNK-2026-0148
  warehouseId String
  warehouse   Warehouse     @relation(fields: [warehouseId], references: [id])
  supplierId  String
  supplier    Supplier      @relation(fields: [supplierId], references: [id])
  refDoc      String?                      // "HĐ mua 0012455 · PO-2026-0311"
  status      ReceiptStatus @default(DRAFT)
  vatRate     Int           @default(8)
  netAmount   Int           @default(0)
  vatAmount   Int           @default(0)
  grossAmount Int           @default(0)
  note        String?
  createdById String
  postedAt    DateTime?
  createdAt   DateTime      @default(now())
  lines       GoodsReceiptLine[]
  events      GoodsReceiptEvent[]
}

model GoodsReceiptLine {
  id        String       @id @default(cuid())
  receiptId String
  receipt   GoodsReceipt @relation(fields: [receiptId], references: [id], onDelete: Cascade)
  variantId String
  sku       String
  qty       Int
  unitCost  Int                            // giá vốn nhập
  lineTotal Int
}

model GoodsReceiptEvent {
  id        String       @id @default(cuid())
  receiptId String
  receipt   GoodsReceipt @relation(fields: [receiptId], references: [id], onDelete: Cascade)
  what      String                         // "Kiểm đếm thực tế, lệch 0 sản phẩm"
  who       String
  createdAt DateTime     @default(now())
}

enum MovementType { RECEIPT SALE RETURN ADJUST CANCEL TRANSFER }

// Sổ cái tồn kho. Variant.stock luôn = Σ(delta) của variant đó.
model InventoryMovement {
  id        String       @id @default(cuid())
  variantId String
  variant   Variant      @relation(fields: [variantId], references: [id])
  type      MovementType
  delta     Int                            // + nhập, − xuất
  stockAfter Int
  refType   String?                        // "GoodsReceipt" | "Order"
  refId     String?
  note      String?
  actorName String?
  createdAt DateTime     @default(now())
  @@index([variantId, createdAt])
}

// ─── Khuyến mãi ──────────────────────────────────────────────
enum CouponType { PERCENT FIXED FREESHIP }

model Coupon {
  id           String     @id @default(cuid())
  code         String     @unique          // SALE20
  type         CouponType
  value        Int                          // % hoặc số đồng
  minSubtotal  Int        @default(0)
  maxDiscount  Int?
  usageLimit   Int?
  usedCount    Int        @default(0)
  perUserLimit Int?
  memberOnly   Boolean    @default(false)
  startsAt     DateTime
  endsAt       DateTime
  active       Boolean    @default(true)
  @@index([code, active])
}

// ─── Đánh giá & hỗ trợ ───────────────────────────────────────
model Review {
  id         String   @id @default(cuid())
  productId  String
  product    Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  orderId    String?                        // đánh giá đã mua hàng
  authorName String
  rating     Int                            // 1–5
  body       String   @db.Text
  imageUrls  String[]
  approved   Boolean  @default(false)
  createdAt  DateTime @default(now())
  @@index([productId, approved])
}

enum TicketStatus { OPEN PENDING RESOLVED CLOSED }

model Ticket {
  id        String       @id @default(cuid())
  code      String       @unique
  userId    String?
  user      User?        @relation(fields: [userId], references: [id])
  orderCode String?
  subject   String
  status    TicketStatus @default(OPEN)
  channel   String                          // "Zalo", "Hotline", "Web"
  messages  TicketMessage[]
  createdAt DateTime     @default(now())
}

model TicketMessage {
  id        String   @id @default(cuid())
  ticketId  String
  ticket    Ticket   @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  authorName String
  isStaff   Boolean  @default(false)
  body      String   @db.Text
  createdAt DateTime @default(now())
}

// ─── Hạ tầng ─────────────────────────────────────────────────
model WebhookEvent {
  id              String   @id @default(cuid())
  provider        String                     // "vnpay" | "ghn" | "shopee"
  providerEventId String
  payload         Json
  processedAt     DateTime?
  createdAt       DateTime @default(now())
  @@unique([provider, providerEventId])      // chống xử lý trùng
}

model OtpCode {
  id        String   @id @default(cuid())
  phone     String
  codeHash  String
  expiresAt DateTime
  usedAt    DateTime?
  attempts  Int      @default(0)
  @@index([phone, expiresAt])
}

model Setting {
  key   String @id
  value Json
}

model SizeChart {
  id      String   @id @default(cuid())
  name    String
  slug    String   @unique
  fit     String   @default("")   // ghi chú form: "Form vừa, lên một size nếu thích rộng"
  howTo   String[]                 // hướng dẫn đo, mỗi bước một dòng
  columns String[]                 // KHÔNG chứa cột "Size" — chèn tự động khi hiện
  rows       SizeChartRow[]
  categories Category[]
  products   Product[]
}

model SizeChartRow {
  id      String   @id @default(cuid())
  chartId String
  chart   SizeChart @relation(fields: [chartId], references: [id], onDelete: Cascade)
  size    String                    // S · M · L · 29 · 30
  values  String[]                  // xếp đúng thứ tự `chart.columns`
  sort    Int      @default(0)
  @@index([chartId, sort])
}
```

## Quy tắc nghiệp vụ bắt buộc

1. **`Variant.stock` là dữ liệu dẫn xuất.** Mọi thay đổi phải kèm một `InventoryMovement` trong cùng transaction, và `stockAfter` phải khớp. Viết một test bất biến: `stock === sum(movements.delta)` cho mọi variant.

2. **Ghi sổ phiếu nhập** (`DRAFT → POSTED`): trong một transaction — tạo movement `RECEIPT` cho từng dòng, cộng `stock`, set `postedAt`, ghi event. Phiếu `POSTED` không cho sửa dòng hàng. Sai thì lập phiếu điều chỉnh mới.

3. **Tích điểm** chỉ khi `Order.userId != null` **và** `paymentStatus = PAID` **và** `status = DELIVERED`. Công thức `floor(total / 1000)`. Đơn huỷ hoặc hoàn → ghi `PointEntry` âm với `reason = REFUND`, không xoá bản ghi cũ.

4. **Mã đơn** `MSH-<năm>-<số tăng dần 5 chữ số>`, sinh bằng sequence trong DB, không phải random. Tương tự `PNK-`, `HD-`.

5. **Guest tra cứu đơn** bằng `code` + 4 số cuối `phone`. Rate limit 10 lần/IP/giờ.

6. **Coupon** kiểm tại thời điểm đặt: còn hạn, `active`, `usedCount < usageLimit`, `subtotal >= minSubtotal`, và nếu `memberOnly` thì đơn phải có `userId`. `usedCount` tăng trong transaction tạo đơn.

7. **Bảng size: sản phẩm đè lên danh mục.** `Product.sizeChartId` bỏ trống nghĩa là "theo danh mục", không phải "không có bảng". Cả hai quan hệ khai `onDelete: SetNull`, nên **DB không chặn** việc xoá một bảng đang có người dùng — phải chặn ở tầng nghiệp vụ (`deleteSizeChart` ném `ChartInUseError`), nếu không hàng loạt danh mục mất bảng size trong im lặng.
