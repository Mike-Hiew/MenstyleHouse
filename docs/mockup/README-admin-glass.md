# Admin "Modernist Glass"

Mockup gốc: Claude Design, file `MSH Admin Glass.html` (dự án `6dd175a2-79d2-4682-8c9e-c46081460437`).

Đã áp vào code sau cờ `NEXT_PUBLIC_FF_ADMIN_GLASS` (mặc định bật, `0` là về Modernist):

- Token: `.theme-glass` trong `src/app/globals.css`.
- Khung: `src/components/admin/admin-shell.tsx` (thanh bên và thanh trên kính nổi).
- Bảng chung: `src/components/admin/data-table.tsx`, `src/components/ui/table.tsx` (móc class `adm-*`).
- Tổng quan: `src/app/admin/page.tsx` (thẻ số liệu, số chạy, biểu đồ cột mọc lên).
- Các màn còn lại không sửa markup: CSS trong phạm vi `.theme-glass .adm-page` bo lại ô nhập, nút, khung viền 2px và bảng tự viết.

Khác mockup có chủ ý:

- Giữ font Archivo + JetBrains Mono của hệ thống thay cho Onest + Geist Mono: hai font của mockup không có bộ ký tự tiếng Việt trên Google Fonts, chữ có dấu sẽ rơi về font dự phòng.
- Giữ nguyên nội dung, cột bảng, số liệu thật của từng màn — mockup chỉ quyết định kiểu và chuyển động.
