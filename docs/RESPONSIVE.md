# Quy tắc responsive

Responsive thuần: **một trang, một cây DOM, gập theo breakpoint**. Không có route `/m/`, không có bottom nav kiểu app, không có component tách riêng cho mobile. Ai thêm `useMediaQuery` để render hai nhánh JSX khác nhau là đi sai hướng — dùng CSS.

Bản mockup đối chiếu: `docs/mockup/Men Style House Mobile.dc.html` (12 màn ở 390 × 844).

## Breakpoint

Dùng thang mặc định của Tailwind, chỉ chạm ba mốc:

| Mốc | Bề rộng | Dùng cho |
|---|---|---|
| (mặc định) | < 640 | Điện thoại. **Viết CSS cho mốc này trước.** |
| `md:` | ≥ 768 | Máy tính bảng, điện thoại ngang |
| `lg:` | ≥ 1024 | Desktop — bố cục hiện tại của M0/M1 |

Không dùng `sm:`, `xl:`, `2xl:` trừ khi có lý do viết ra trong PR. Càng ít mốc càng dễ giữ.

Mobile-first nghĩa là: `class="grid grid-cols-2 lg:grid-cols-4"` — **không phải** `grid-cols-4 max-lg:grid-cols-2`.

## Vùng chạm

- Mọi thứ bấm được: tối thiểu **44 × 44px**. Nút chính trên mobile cao **48px** (`h-12`), nút trong thanh dưới đáy cao **50px**.
- Khoảng cách giữa hai đích chạm cạnh nhau ≥ 8px.
- Ô nhập liệu `font-size` ≥ 16px, nếu không iOS Safari sẽ tự phóng to trang khi focus. Cụ thể: dùng `text-base` cho `input`/`select`/`textarea` ở mốc mặc định, `lg:text-sm` cho desktop.

## Bố cục từng khối

### Header
Desktop: logo + nav ngang + 3 icon. Mobile: hamburger → logo → tìm kiếm → giỏ.
Nav danh mục chuyển vào drawer trượt từ trái. Thanh khuyến mãi phía trên giữ nguyên, chỉ giảm chữ xuống 11px.

```
<nav class="hidden lg:flex …">      ← nav ngang
<button class="lg:hidden …">        ← hamburger
```

### Lưới sản phẩm
2 cột mặc định, 3 cột ở `md:`, 4 cột ở `lg:`. Khách bấm đổi được 1 ↔ 2 cột trên mobile; lựa chọn lưu ở `localStorage` khoá `msh:grid`, mặc định 2 cột.

```
grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4
```

Khi khách chọn 1 cột thì thành `grid-cols-1`, ảnh giữ `aspect-[3/4]`, tên và giá vẫn nằm dưới ảnh (không tràn sang cạnh phải).

Khoảng cách giữa các ô: `gap-6` (24px) như desktop, không đổi theo bề rộng.

Trước đây chỗ này ghi là kẻ chỉ `gap-px bg-divider` + ô nền `bg-surface`, và mã
làm đúng như thế. **Đó là sai so với mockup**: cả bốn lưới sản phẩm trong mockup
đều là `grid-template-columns:repeat(4,1fr);gap:24px`, thẻ không có nền riêng, và
phần chữ thụt lề `14px 0 0` nên nằm thẳng hàng với mép ảnh. Kẻ chỉ vẫn dùng, chỉ
là dùng cho **ô số liệu trong admin**, không dùng cho thẻ sản phẩm.

### Bộ lọc — điểm khác biệt lớn nhất
Desktop: sidebar trái cố định. Mobile: **sheet trượt từ dưới lên**.

- Thanh dưới đáy cố định (`sticky bottom-0`) có hai nút: **Lọc** (kèm huy hiệu số lọc đang bật) và **Sắp xếp**.
- Bấm Lọc → sheet cao ~85vh trượt lên, nền phủ `rgba(32,30,29,.55)`.
- Trong sheet: các nhóm lọc xếp dọc, ngăn nhau bằng kẻ mảnh `#d7d3d3`. Ô size là ô vuông ≥ 44px, không phải checkbox nhỏ.
- Chân sheet cố định: **Xoá lọc** (phụ) + **Áp dụng · N sản phẩm** (chính, đỏ). Số N cập nhật theo thời gian thực khi tick.
- **Trên mobile lọc chỉ áp dụng khi bấm Áp dụng**, không áp ngay khi tick. Desktop thì áp ngay. Đây là khác biệt hành vi có chủ ý — lọc lại lưới sau lưng sheet gây giật.
- Đóng sheet: nút ✕, chạm nền phủ, hoặc vuốt xuống.
- Chip lọc đang bật hiện thành hàng cuộn ngang ngay trên lưới, kèm **Xoá tất cả**.

Sheet dùng chung cho cả Lọc và Sắp xếp — một component `<BottomSheet>`, hai nội dung.

### Chi tiết sản phẩm
Desktop hai cột (gallery trái, thông tin phải) → mobile một cột dọc.
Gallery thành carousel vuốt ngang, chỉ báo là các vạch ngang ở đáy ảnh (không phải chấm tròn — hệ thống không bo góc).
Nút **Thêm vào giỏ** dính đáy màn hình (`sticky bottom-0`) cùng bộ đếm số lượng.

### Giỏ hàng
Desktop: bảng + hộp tổng kết bên phải. Mobile: mỗi dòng thành thẻ ngang (ảnh 84 × 112 bên trái, thông tin bên phải), hộp tổng kết xuống dưới cùng, **Tổng cộng + nút Thanh toán** dính đáy.

### Thanh toán 4 bước
Thanh bước ngang giữ nguyên nhưng thu gọn: chỉ số thứ tự + nhãn ngắn, gạch dưới 3px đánh dấu bước hiện tại.
Trường form xếp một cột; riêng **Quận/Huyện + Phường/Xã** đứng cạnh nhau vì hai trường ngắn.
Nút **Quay lại / Tiếp tục** dính đáy.

### Bảng admin → thẻ
Bảng dữ liệu không cuộn ngang trên mobile. Dưới `lg:`, mỗi hàng render thành một thẻ có viền 2px:

- Dòng 1: mã (mono, đậm) + huy hiệu trạng thái
- Dòng 2: tên khách / tên sản phẩm
- Dòng 3: thông tin phụ, gộp bằng dấu `·`
- Chân thẻ (có kẻ ngăn): thời gian bên trái, số tiền bên phải

Làm bằng CSS trên cùng markup — `<table>` nhận `class="max-lg:block"`, `<tr>` nhận `max-lg:block max-lg:border-2`, `<td>` ẩn nhãn cột bằng `data-label`. Không render hai cây khác nhau.

Lọc trạng thái trên mobile: hàng chip cuộn ngang thay cho tab.

### Dialog
Dưới `lg:`, mọi `<Dialog>` chuyển thành sheet đáy: dính `bottom-0`, rộng hết màn, cao tối đa `85vh`, chân nút cố định. Sửa một chỗ trong `components/ui/dialog.tsx` là xong toàn bộ.

## Bảng in ấn không đổi
Hoá đơn A4 và phiếu nhiệt 80mm đã có khổ cố định trong CSS in. Không đụng đến — chúng không đọc breakpoint màn hình.

## Việc phải làm khi nhận task này

1. `components/ui/bottom-sheet.tsx` — mới.
2. `components/ui/dialog.tsx` — dưới `lg:` chuyển thành sheet đáy.
3. `components/ui/table.tsx` — thêm chế độ thẻ dưới `lg:`.
4. `components/storefront/site-header.tsx` — hamburger + drawer.
5. Lưới sản phẩm — 2 cột mặc định + nút đổi 1↔2 cột.
6. Chi tiết, giỏ, thanh toán — thanh hành động dính đáy.

## Kiểm tra trước khi đóng task

- [ ] 390px: không có thanh cuộn ngang ở bất kỳ màn nào.
- [ ] 320px (iPhone SE): không vỡ, chữ không tràn.
- [ ] Mọi nút ≥ 44px chiều cao thật (đo bằng devtools, không ước lượng).
- [ ] Focus bàn phím vẫn thấy viền đỏ 2px trong sheet.
- [ ] Mở sheet thì nền sau không cuộn được.
- [ ] iOS Safari: chạm vào ô nhập không làm trang tự phóng to.
- [ ] Thanh dính đáy không che mất nội dung cuối trang (chừa `padding-bottom` bằng chiều cao thanh).
- [ ] `env(safe-area-inset-bottom)` cho iPhone có thanh gạch dưới.
