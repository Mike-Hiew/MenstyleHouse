# Mockup — Men Style House

## Đối chiếu với mockup desktop: đọc trước khi kết luận

```bash
node scripts/trich-mockup.mjs     # sinh docs/mockup/trich-day-du.txt
grep -n "chuỗi cần tìm" docs/mockup/trich-day-du.txt
```

`mockup.html` là bundle 3MB, markup nằm dưới dạng chuỗi JS đã escape. Grep
thẳng vào nó gần như vô dụng — phải trích trước.

**Mockup có hai nửa, và nửa nào cũng cần:**

| Nửa | Chứa gì | Ví dụ |
|---|---|---|
| markup | khung HTML, nhãn là placeholder | `{{ n.label }}`, `<sc-if value="{{ aInvoice }}">` |
| dữ liệu | nhãn thật, cấu hình bảng, danh sách trường | `navItems`, `actionLabel`, `cols`, `filters`, `fields` |

Nhãn sidebar, tiêu đề cột, nhãn nút, danh sách ô của từng form — **tất cả nằm ở
nửa dữ liệu**. Tìm chúng trong bản markup thì luôn ra rỗng, kể cả khi mockup có.

### Luật: trước khi kết luận “mockup không có X”, chạy một phép thử đối chứng

Tìm một thứ **biết chắc là có** cùng loại với X. Không thấy nó nghĩa là công cụ
đang tìm sai chỗ, và câu trả lời rỗng cho X không có giá trị gì.

```bash
# Định hỏi “có mục sidebar Danh mục không?” → thử một nhãn sidebar đã biết:
grep -c "Khuyến mãi" docs/mockup/trich-day-du.txt   # phải > 0
```

Chuyện này đã xảy ra thật: bản trích cũ chỉ có markup, tôi grep “Danh mục” ra 0,
rồi kết luận mockup không có màn quản lý danh mục — trong khi `navItems` có hẳn
`['cats','Danh mục & thương hiệu']` và cả một màn `cats`. `scripts/trich-mockup.mjs`
giờ tự chạy phép thử này và **dừng hẳn** nếu bản trích thiếu, thay vì im lặng trả
về một file trông vẫn bình thường.

Kết luận phủ định càng phải soi kỹ khi nó gỡ tội cho chính mình — “không phải tôi
làm lệch, chưa ai đặc tả” là lúc dễ ngừng kiểm tra sớm nhất.

---


Mở `Men Style House Mobile.dc.html` bằng trình duyệt (Chrome/Safari đều được).
File `support.js` phải nằm cùng thư mục, nếu không trang sẽ trắng.

12 khung ở khổ 390 × 844:

| # | Màn hình |
|---|---|
| 01 | Trang chủ |
| 02 | Danh sách sản phẩm · 2 cột |
| 03 | Sheet lọc trượt lên |
| 04 | Chi tiết sản phẩm |
| 05 | Giỏ hàng |
| 06 | Thanh toán · bước 2/4 |
| 07 | Đặt hàng thành công |
| 08 | Tra cứu đơn |
| 09 | Tài khoản · điểm thưởng |
| 10 | Admin · dashboard |
| 11 | Admin · đơn hàng (bảng → thẻ) |
| 12 | Admin · tồn kho theo SKU |

Ảnh sản phẩm tải từ Unsplash nên cần mạng. Không có mạng thì các ô ảnh hiện nền xám — bố cục vẫn đúng.

Quy tắc kỹ thuật đi kèm: `docs/RESPONSIVE.md` (trong bản vá `patch-mobile`).
