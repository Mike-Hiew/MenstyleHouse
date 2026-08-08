# Token màu — nguồn sự thật duy nhất

Lấy từ mockup đã duyệt. `src/app/globals.css` phải khớp bảng này; khi lệch thì **bảng này thắng**.

| Vai trò | Giá trị | Biến Tailwind |
|---|---|---|
| Nền | `#f3f2f2` | `bg` |
| Bề mặt | `#ffffff` | `surface` |
| Khối phụ | `#eae9e9` | `subtle` |
| Chữ | `#201e1d` | `text` |
| Chữ phụ | `#605d5d` | `muted` / `neutral-500` |
| Chữ mờ | `#7d7979` | `faint` |
| Kẻ mảnh | `#d7d3d3` | `hairline` / `neutral-300` |
| Viền mềm | `rgba(32,30,29,.4)` | `border-soft` |
| Kẻ đậm 2px | `#201e1d` | `divider` |
| Nhấn | `#ec3013` | `accent` |
| Nhấn đậm (hover/pressed) | `#ae1800` | `accent-600` |
| Nhấn rất đậm (chữ nhỏ trên nền sáng) | `#8d1300` | `accent-700` |

Chữ: **Archivo** cho UI — heading luôn `font-weight: 800`, `letter-spacing: -.015em`.
**JetBrains Mono** cho SKU, mã đơn, nhãn kỹ thuật — dùng utility `label-tech` (hoa, 11px, tracking .1em, màu `faint`).

Ảnh sản phẩm luôn `grayscale(1) contrast(1.08)` — utility `grayscale-photo`.

Bo góc `0` và đổ bóng `none` bị ép ở tầng `@theme`, nên `rounded-*` và `shadow-*` không còn tác dụng. Không cần tự nhắc.
