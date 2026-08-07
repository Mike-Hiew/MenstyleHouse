# Men Style House

Hệ thống bán quần áo nam — Next.js 15 (App Router) + PostgreSQL + Prisma.
Giao diện theo hệ thống thiết kế **Modernist**: nền #f3f2f2, chữ #201e1d, nhấn đỏ #ec3013, font Archivo, **không bo góc, không đổ bóng**.

Mockup gốc và tài liệu bàn giao: `design_handoff_menstylehouse/`.

## Chạy lần đầu

```bash
npm install
cp .env.example .env          # sửa DATABASE_URL
npm run db:push               # tạo bảng
npm run db:seed               # 40 sản phẩm, 30 đơn, 12 khách
npm run dev
```

Mở http://localhost:3000

## Cấu trúc

```
prisma/schema.prisma      Toàn bộ schema (DATA-MODEL.md)
prisma/seed.ts            Dữ liệu mẫu, có hạt giống cố định
src/app/globals.css       Token Modernist (Tailwind v4 @theme)
src/lib/db.ts             Prisma client singleton
src/lib/money.ts          Tiền = Int đồng. Không dùng Float.
src/lib/inventory.ts      ĐIỂM VÀO DUY NHẤT để đổi tồn kho
src/lib/codes.ts          Sinh mã MSH-/PNK-/HD- tăng dần từ DB
src/lib/format.ts         Ngày giờ VN + xuất CSV có BOM
src/components/ui/        Button, Input, Select, Checkbox, Radio,
                          Badge, Table, Dialog, Toast
tests/inventory.test.ts   Test bất biến stock === Σ(movements.delta)
```

## Ba luật không được phá

1. **Tiền là `Int` đồng.** Không `Float`, không `Decimal` ở tầng ứng dụng.
2. **Không `UPDATE stock` ở bất kỳ đâu ngoài `src/lib/inventory.ts`.** Mọi thay đổi đi qua `moveStock()` và luôn sinh `InventoryMovement` cùng transaction.
3. **`Order` snapshot địa chỉ, không tham chiếu `Address`.** Khách sửa địa chỉ thì đơn cũ không được đổi theo.

## Tiến độ

- [x] **M0 — Nền móng.** Scaffold, schema, token, primitive UI, seed, header storefront.
- [ ] M1 — Storefront đọc
- [ ] M2 — Giỏ + checkout + guest/member
- [ ] M3 — Admin lõi (DataTable + CsvExportDialog dùng chung)
- [ ] M4 — Kho + phiếu nhập (bật test bất biến trong CI)
- [ ] M5 — Hoá đơn + VNPay
- [ ] M6 — Khuyến mãi + báo cáo + hỗ trợ
- [ ] M7 — GHN + OTP
- [ ] M8 — Kế toán + sàn TMĐT

Chi tiết từng milestone: `design_handoff_menstylehouse/BUILD-PLAN.md`.
