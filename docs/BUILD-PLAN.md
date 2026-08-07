# Lộ trình xây dựng — cho Claude Code

Repo `Mike-Hiew/MenstyleHouse` đang trống. Làm tuần tự theo milestone; mỗi milestone là một PR chạy được, không gộp.

Nguyên tắc xuyên suốt: **không milestone nào được merge nếu chưa có seed data chạy được và màn hình liên quan mở lên xem được bằng mắt.**

---

## M0 — Nền móng
- `create-next-app` với TypeScript, App Router, Tailwind v4.
- Prisma + PostgreSQL, chạy `schema.prisma` trong `DATA-MODEL.md`.
- `next/font/google` self-host Archivo (400/500/600/800) + JetBrains Mono (400/700).
- Tailwind theme khai báo đúng token trong `README.md`; **set `borderRadius.DEFAULT = 0` và `boxShadow.DEFAULT = 'none'` toàn cục** để không lỡ tay dùng bo góc.
- Primitive UI: `Button` (variant `primary`/`secondary`/`ghost`), `Input`, `Select`, `Checkbox`, `Radio`, `Badge`, `Table`, `Dialog`, `Toast`.
- Seed: 40 sản phẩm × biến thể màu/size, 8 danh mục, 6 thương hiệu, 3 kho/nhà cung cấp, 30 đơn mẫu ở đủ trạng thái.

**Xong khi:** trang trắng dùng primitive dựng lại được header storefront giống hệt mockup.

## M1 — Storefront đọc
Trang chủ, danh sách sản phẩm (lọc + sắp xếp + trạng thái rỗng), chi tiết sản phẩm (gallery, chọn màu/size, bảng size, đánh giá).

**Xong khi:** duyệt được toàn bộ catalog từ dữ liệu thật, bộ lọc trả đúng số đếm.

## M2 — Giỏ + checkout + guest/member
- Giỏ hàng cho guest (cookie) và member (userId), gộp giỏ khi đăng nhập.
- Checkout 3 bước, phí vận chuyển tạm tính bằng bảng phí phẳng.
- Đăng ký / đăng nhập (Auth.js), **không bắt buộc**.
- Popup mời đăng ký: một lần mỗi phiên, tự tắt sau 15s, nút "Để sau" rõ ràng.
- Đặt đơn COD, trừ tồn trong transaction, sinh mã đơn.
- Trang kết quả đơn + tra cứu đơn bằng mã + SĐT.

**Xong khi:** một người lạ mua xong đơn COD mà không cần đăng ký; một member mua xong thấy điểm được ghi nhận.

## M3 — Admin lõi
Layout admin + phân quyền. Dashboard, bảng sản phẩm, màn sửa sản phẩm với bảng biến thể, bảng đơn hàng, chi tiết đơn + đổi trạng thái.

Kèm **`DataTable` dùng chung** (phân trang, sắp xếp, lọc, chọn dòng) và **`CsvExportDialog`** đúng 4 bước trong mockup — làm một lần, dùng cho mọi bảng.

**Xong khi:** nhân viên xử lý được đơn từ `PENDING` đến `DELIVERED` hoàn toàn trong admin.

## M4 — Kho + phiếu nhập
- Màn tồn kho theo SKU, cảnh báo sắp hết.
- Phiếu nhập kho: tạo nháp, sửa dòng hàng, tính VAT, **ghi sổ một chiều** sinh `InventoryMovement`.
- Phiếu điều chỉnh tồn.
- **Test bất biến:** với mọi variant, `stock === sum(movements.delta)`. Test này phải chạy trong CI.

**Xong khi:** ghi sổ một phiếu 4 dòng thì tồn kho ở màn sản phẩm đổi đúng, và ghi sổ lần hai bị chặn.

## M5 — Hoá đơn + thanh toán online
- Hoá đơn GTGT: tạo từ đơn, bản in A4 và bản in 80mm bằng CSS `@page`.
- Tích hợp VNPay (sandbox → production), webhook idempotent, đối chiếu số tiền.
- Job huỷ đơn chưa thanh toán quá 30 phút.

**Xong khi:** thanh toán VNPay sandbox thành công thì đơn tự chuyển `PAID`; gọi lại webhook không tạo hiệu ứng phụ.

## M6 — Khuyến mãi + báo cáo + hỗ trợ
Mã giảm giá (điều kiện, hạn dùng, giới hạn lượt, chỉ-thành-viên), báo cáo doanh thu theo ngày/tuần/tháng, top sản phẩm, ticket hỗ trợ.

## M7 — Vận chuyển + OTP
GHN thật (báo giá + tạo vận đơn + webhook trạng thái), OTP qua Zalo ZNS với SMS dự phòng. Sau đó thêm dần GHTK, Viettel Post, MoMo, ZaloPay — kiến trúc không đổi.

## M8 — Kế toán + sàn TMĐT
Xuất file cho MISA/Fast, hoá đơn điện tử. Cuối cùng mới đến Shopee/TikTok Shop — chỉ làm khi test bất biến tồn kho đã chạy ổn định nhiều tuần.

---

## Definition of done cho mọi milestone

- Màn hình khớp mockup: màu, font, spacing, không bo góc, không đổ bóng.
- Kiểm tra dữ liệu ở server bằng Zod, không chỉ ở client.
- Trạng thái rỗng, trạng thái đang tải, trạng thái lỗi — đủ ba, đúng văn phong tiếng Việt trong mockup.
- Bàn phím dùng được: tab đi hết form, `focus-visible` viền đỏ 2px, dialog bẫy focus và đóng bằng `Esc`.
- Seed data phản ánh được tính năng vừa làm.

## Bẫy thường gặp — tránh từ đầu

1. **Đừng dùng `Float` cho tiền.** Dùng `Int` đồng.
2. **Đừng `UPDATE stock` trực tiếp** ở bất kỳ đâu ngoài `lib/inventory.ts`.
3. **Đừng tham chiếu `Address` từ `Order`.** Đơn phải snapshot địa chỉ, nếu không khách sửa địa chỉ là đơn cũ đổi theo.
4. **Đừng tin số tiền từ webhook.** Đối chiếu DB.
5. **Đừng chặn checkout khi API vận chuyển lỗi.** Rơi về bảng phí phẳng.
6. **Đừng bắt đăng nhập.** Guest phải mua được từ đầu đến cuối.
7. **Đừng để popup đăng ký chặn thao tác** — tự tắt 15s, một lần mỗi phiên.
8. **CSV cho Excel bản Việt cần BOM.** Thiếu `\uFEFF` là mở ra lỗi font tiếng Việt.
