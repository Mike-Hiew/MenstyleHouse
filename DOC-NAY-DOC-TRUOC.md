# Bản vá mobile

```
docs/RESPONSIVE.md    ← MỚI, quy tắc responsive cho dev
```

Kèm theo: mockup 12 màn mobile ở `Men Style House Mobile.dc.html` (trong dự án thiết kế).
Chép nó vào `docs/mockup/` cùng `support.js` nếu muốn đối chiếu offline.

Tóm tắt quyết định:
- Responsive thuần, ba mốc: mặc định / `md:` 768 / `lg:` 1024. Viết mobile-first.
- Bộ lọc trên mobile = sheet trượt lên, **chỉ áp dụng khi bấm nút Áp dụng**.
- Lưới sản phẩm 2 cột, khách bấm đổi được 1↔2, lưu `localStorage` khoá `msh:grid`.
- Bảng admin dưới `lg:` thành thẻ — bằng CSS trên cùng markup, không render hai nhánh JSX.
- Dialog dưới `lg:` thành sheet đáy: sửa một chỗ trong `ui/dialog.tsx`.
