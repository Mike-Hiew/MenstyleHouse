# Tích hợp bên thứ ba — Men Style House

Tất cả adapter nằm trong `src/lib/integrations/`, mỗi nhà cung cấp một file, đứng sau một interface chung để đổi nhà cung cấp không phải sửa nghiệp vụ. Không gọi thẳng SDK từ component.

## 1. Cổng thanh toán — VNPay, MoMo, ZaloPay

Interface chung:
```ts
interface PaymentProvider {
  createPayment(order: Order, returnUrl: string): Promise<{ redirectUrl: string; providerTxnId: string }>
  verifyWebhook(req: Request): Promise<{ ok: boolean; providerTxnId: string; amount: number; paid: boolean }>
  refund(payment: Payment, amount: number): Promise<{ ok: boolean; refundId: string }>
}
```

Điểm phải làm đúng:
- **Luôn đối chiếu số tiền** webhook trả về với `Order.total` trong DB. Lệch → không đánh dấu `PAID`, ghi log cảnh báo.
- VNPay ký `HMAC-SHA512` trên chuỗi query đã sort theo alphabet; sai thứ tự là sai chữ ký.
- MoMo và ZaloPay dùng `HMAC-SHA256`; mỗi bên có định dạng chuỗi ký riêng — đọc doc hiện hành, đừng đoán.
- Cả ba đều gọi webhook (IPN) **và** redirect người dùng về `returnUrl`. Chỉ tin webhook để đổi trạng thái; `returnUrl` chỉ dùng để hiển thị.
- Sandbox trước, có biến môi trường `PAYMENT_ENV=sandbox|production`.
- Timeout đơn chưa thanh toán: job huỷ đơn `PENDING` + `UNPAID` quá 30 phút, hoàn tồn kho.

## 2. Vận chuyển — GHN, GHTK, Viettel Post

```ts
interface ShippingProvider {
  quote(from: Address, to: Address, weightGram: number, value: number): Promise<{ fee: number; etaText: string }>
  createOrder(order: Order): Promise<{ trackingCode: string; labelUrl?: string }>
  cancel(trackingCode: string): Promise<void>
  parseWebhook(req: Request): Promise<{ trackingCode: string; status: OrderStatus }>
}
```

- Báo giá gọi **song song cả ba hãng**, timeout 3s mỗi hãng, hãng nào lỗi thì ẩn khỏi danh sách chứ không chặn checkout. Nếu cả ba lỗi, rơi về bảng phí phẳng cấu hình trong `Setting`.
- GHN và GHTK dùng mã tỉnh/quận/phường riêng — cần bảng ánh xạ địa giới, đồng bộ lại theo tháng. Lưu cả `provinceCode` chuẩn hoá lẫn tên hiển thị.
- Trọng lượng: mỗi `Variant` nên có `weightGram` (thêm vào schema nếu cần) — mặc định 300g/áo, 600g/quần nếu chưa nhập.
- Webhook trạng thái vận chuyển ánh xạ về `OrderStatus` nội bộ; không lưu chuỗi trạng thái thô của hãng vào `Order.status`.

## 3. SMS / Zalo OTP

- Zalo ZNS cho khách đã có Zalo (rẻ hơn, tỷ lệ đến cao); rơi về SMS brandname nếu ZNS thất bại.
- Template phải đăng ký trước với nhà mạng/Zalo — không gửi được nội dung tuỳ ý.
- Rate limit qua Redis: 5 mã/SĐT/giờ, 20 mã/IP/giờ. Mã 6 số, sống 5 phút, hash trước khi lưu, sai 5 lần thì huỷ.
- Dùng cho: xác thực đăng ký, đăng nhập không mật khẩu, thông báo đơn hàng đã giao cho vận chuyển.

## 4. Kế toán — MISA / Fast

- Đây là tích hợp **một chiều, theo lô** — không đồng bộ thời gian thực. Job chạy cuối ngày đẩy: hoá đơn bán ra, phiếu nhập kho, phiếu thu.
- MISA có API AMIS; Fast thường nhập qua file Excel/XML theo mẫu. Xây tầng export chung trước, adapter riêng sau — khả năng cao giai đoạn đầu chỉ cần xuất file đúng mẫu để kế toán nhập tay.
- Ghi `syncedAt` trên `Invoice` và `GoodsReceipt` để không đẩy trùng.
- Hoá đơn điện tử là nghĩa vụ pháp lý riêng — cần nhà cung cấp có kết nối Tổng cục Thuế (Viettel, VNPT, MISA meInvoice). Trường `Invoice.eInvoiceId` để lưu mã tra cứu.

## 5. Sàn TMĐT — Shopee, TikTok Shop

Rủi ro lớn nhất của toàn hệ thống: **bán trùng tồn kho**. Cùng một SKU bán trên web và trên sàn.

- Nguồn sự thật là hệ thống này. Sau mỗi `InventoryMovement`, đẩy tồn mới lên các sàn đã liên kết (debounce 30s để gộp thay đổi liên tiếp).
- Đơn từ sàn kéo về bằng webhook, tạo `Order` với `channel = "shopee"` (thêm trường `channel` vào `Order` khi làm milestone này) và trừ tồn như đơn thường.
- Cả hai sàn dùng OAuth + refresh token có hạn; cần job làm mới token và cảnh báo khi hết hạn.
- Ánh xạ SKU: bảng `ChannelListing { channel, externalItemId, externalSkuId, variantId }`. Không suy đoán theo tên sản phẩm.
- Giữ tồn đệm (buffer) cấu hình được, ví dụ giữ lại 2 sản phẩm/SKU không đẩy lên sàn, để giảm rủi ro oversell khi có độ trễ.

## Thứ tự làm

Không làm tất cả cùng lúc. Ưu tiên theo giá trị và rủi ro:

1. **COD + một cổng (VNPay)** — đủ để bán hàng thật.
2. **GHN** — một hãng vận chuyển trước, thêm hãng sau khi interface đã ổn định.
3. **OTP** — cần cho đăng ký và bảo mật tài khoản.
4. MoMo, ZaloPay, GHTK, Viettel Post — thêm dần, không đổi kiến trúc.
5. **Kế toán** — xuất file trước, API sau.
6. **Sàn TMĐT** — làm cuối, sau khi sổ cái tồn kho đã chạy ổn định và có test bất biến `stock === sum(movements)`.

Mọi khoá API để trong biến môi trường, không commit. Có `.env.example` liệt kê đủ tên biến với giá trị giả.
