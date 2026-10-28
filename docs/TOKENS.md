# Token màu — nguồn sự thật duy nhất

`src/app/globals.css` phải khớp bảng này; khi lệch thì **bảng này thắng**.

Có **hai bộ token**:

- **Storefront — v2 "borderless editorial"** (mockup `Men_Style_House_V2.html`): token ở `@theme`.
- **Admin — Modernist** (mockup gốc `docs/mockup/mockup.html`): đặt lại toàn bộ biến
  trong `.theme-modernist` cuối `globals.css`, gắn ở `AdminShell`. Admin chưa đổi
  giao diện; bản admin mới sẽ theo `docs/mockup/glassy-v2.html`.

Tailwind v4 sinh mọi utility qua `var(--…)`, nên **dùng cùng một class cho cả hai**
và để token quyết định. Ví dụ `border-2 border-divider bg-field`: storefront ra ô nền
đặc không viền (divider trong suốt), admin ra ô trắng viền 2px.

## Storefront v2

| Vai trò | Giá trị | Biến Tailwind |
|---|---|---|
| Nền | `#F3F1ED` | `bg` |
| Bề mặt (thẻ, panel) | `#FFFFFF` | `surface` |
| Cát (khối phụ, ảnh chờ) | `#E9E4DC` | `sand` / `subtle` |
| Đá | `#DDD7CE` | `stone` |
| Mực | `#151413` | `text` / `neutral-900` |
| Chữ phụ | `#726C66` | `muted` |
| Ô nhập, chip, nút phụ | `rgba(21,20,19,.06)` | `field` (hover: `field-hover`) |
| Vòng focus ô nhập | `rgba(21,20,19,.14)` | `ring` |
| Kẻ đậm | trong suốt | `divider` |
| Viền mềm | trong suốt | `border-soft` |
| Kẻ mảnh (chỉ còn là vệt tông) | `rgba(21,20,19,.07)` | `hairline` |
| Đỏ | `#E8341A` (hover `#C9270F`) | `accent` / `accent-600` |

**Không kẻ viền.** Khối tách nhau bằng khoảng trắng, tông nền (`bg` → `surface` → `sand`) và bóng:

| Bóng | Giá trị | Utility |
|---|---|---|
| Mềm | `0 1px 2px rgba(20,18,16,.04), 0 8px 24px -12px rgba(20,18,16,.14)` | `shadow-soft` |
| Nổi | `0 30px 60px -24px rgba(20,18,16,.28)` | `shadow-raised` |

**Bo góc:** ảnh và thẻ `rounded-card` (24px), panel `rounded-panel` (32px); nút, chip, ô
nhập `rounded-full`. Ô nhập nhiều dòng `rounded-2xl`.

**Đỏ chỉ cho nút chính và giá sale** (cùng nhãn %, logo, huy hiệu số món trong giỏ).
Lỗi nhập liệu vẫn dùng `accent-100`/`accent-800`. Link thường là chữ mực gạch chân.

**Chữ:** Archivo bản variable, có trục `wdth` 62–125 (`font-variation-settings: "wdth" …`).
JetBrains Mono **chỉ** cho mã sản phẩm, SKU, mã đơn, mã yêu cầu. `label-tech` ở
storefront là chữ sans.

Ảnh sản phẩm hiện màu thật; `grayscale-photo` chỉ còn tác dụng trong admin.

## Admin — Modernist

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

Heading `font-weight: 800`, `letter-spacing: -.015em`. `label-tech` là JetBrains Mono
(hoa, 11px, tracking .1em, màu `faint`). Ảnh `grayscale(1) contrast(1.08)`.
Bo góc `0` và đổ bóng `none`; nhãn nút `Button` dồn trái.
