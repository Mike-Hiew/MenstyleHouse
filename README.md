# Men Style House

Hệ thống bán quần áo nam — Next.js 15 (App Router) + PostgreSQL + Prisma.
Giao diện theo hệ thống thiết kế **Modernist**: nền #f3f2f2, chữ #201e1d, nhấn đỏ #ec3013, font Archivo, **không bo góc, không đổ bóng**.

Mockup gốc và tài liệu bàn giao: `docs/` — mockup desktop `docs/mockup/mockup.html`,
mockup mobile `docs/mockup/Men Style House Mobile.dc.html`.

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
src/lib/catalog.ts        Zod cho searchParams, hằng số lọc, tính giá (thuần)
src/lib/size-chart.ts     Bảng size theo nhóm hàng
src/server/catalog.ts     MỌI truy vấn catalog. Component không gọi Prisma.
src/server/navigation.ts  Danh mục cho header/footer
src/components/ui/        Button, Input, Select, Checkbox, Radio,
                          Badge, Table, Dialog, Toast
src/components/storefront/ Header, footer, thẻ sản phẩm, bộ lọc, gallery
tests/inventory.test.ts   Test bất biến stock === Σ(movements.delta)
src/server/cart.ts        Giỏ cookie, gộp giỏ, mã giảm giá gắn vào giỏ
src/server/orders.ts      Đặt đơn COD (idempotent), tra cứu, huỷ đơn
src/server/accounts.ts    Đăng ký, điểm thưởng (PAID + DELIVERED)
src/auth.ts               Auth.js v5 credentials
tests/catalog.test.ts     Số kết quả, tải thêm và sắp xếp khớp DB
src/lib/roles.ts          Vai trò (thuần) — test và client dùng được
src/lib/table-params.ts   Tham số bảng admin trên URL
src/server/admin/         Guard, đơn hàng, sản phẩm, dashboard, tồn kho, phiếu nhập
src/components/admin/     AdminShell, DataTable, CsvExportDialog
tests/orders.test.ts      Huỷ đơn giữ bất biến sổ tồn + rate limit
tests/admin-orders.test.ts Máy trạng thái đơn + phân quyền
tests/receipts.test.ts    Ghi sổ một chiều + VAT + điều chỉnh tồn
```

`src/server/*` gắn `import "server-only"`. Vitest chạy ở Node nên
`vitest.config.ts` trỏ `server-only` sang bản rỗng — chốt chặn thật vẫn còn
khi Next build.

## Responsive

Responsive thuần theo `docs/RESPONSIVE.md`: một cây DOM, gập bằng CSS ở ba mốc
mặc định / `md:` / `lg:`. Không có `useMediaQuery` render hai nhánh JSX.

Primitive dùng cho **mọi milestone** — M2…M8 chỉ việc dùng lại:

| File | Vai trò |
|---|---|
| `components/ui/overlay.ts` | Bẫy focus + Esc + khoá cuộn nền, dùng chung |
| `components/ui/bottom-sheet.tsx` | Sheet trượt đáy (lọc, sắp xếp) |
| `components/ui/dialog.tsx` | Dưới `lg:` tự thành sheet đáy |
| `components/ui/table.tsx` | Dưới `lg:` mỗi hàng thu thành thẻ viền 2px |

Khác biệt hành vi có chủ ý: desktop áp bộ lọc ngay khi tick, mobile chỉ áp khi
bấm **Áp dụng** trong sheet — lọc lại lưới sau lưng sheet gây giật.

Kiểm tra bằng CDP (`Emulation.setDeviceMetricsOverride`), không phải
`--window-size`: headless không giả lập mobile sẽ cho số đo sai.

## Bộ lọc catalog

Mô hình bám `docs/mockup/`:

| Nhóm | Kiểu | Tham số URL |
|---|---|---|
| Danh mục | checkbox có số đếm (OR) | `danh-muc=ao-phong,ao-polo` |
| Size | chip (OR), hết hàng thì mờ | `size=L,XL` |
| Màu | swatch có số đếm (OR) | `mau=Đen,Navy` |
| Khoảng giá | hai ô từ–đến | `gia-tu=200000&gia-den=500000` |
| Thương hiệu | checkbox có số đếm (OR) | `thuong-hieu=Kojima,Fold` |
| Đang giảm giá | bật/tắt | `km=1` |
| Sắp xếp | mới nhất / giá ↑ / giá ↓ / bán chạy | `sap-xep=ban-chay` |
| Tải thêm | số sản phẩm đang mở | `xem=24` |

**Số đếm cạnh mỗi ô** = số sản phẩm mang giá trị đó, tính theo các *nhóm lọc
khác* và bỏ qua lựa chọn trong chính nhóm của nó. Nhờ vậy ô chưa tick không bao
giờ hiện 0 chỉ vì ô bên cạnh đang tick. Trong cùng một nhóm các lựa chọn OR với
nhau nên tick thêm sẽ cho kết quả *rộng hơn* số hiển thị — đúng, không phải lỗi.
`tests/catalog.test.ts` khoá bất biến này qua 8 tổ hợp lọc.

Hai mockup mâu thuẫn ở nhóm này (desktop: chọn một danh mục, slider giá tối đa,
không lọc màu). Đã chốt theo **mockup mobile** vì nó là tập cha và
`docs/RESPONSIVE.md` cấm tách hai nhánh giao diện.

Giá thực tế là `salePrice ?? basePrice`. Prisma không lọc/sắp xếp trên
`COALESCE`, nên sắp xếp theo giá và theo lượt bán chạy được làm trong bộ nhớ,
còn `WHERE` vẫn là nguồn sự thật duy nhất.

## Ba luật không được phá

1. **Tiền là `Int` đồng.** Không `Float`, không `Decimal` ở tầng ứng dụng.
2. **Không `UPDATE stock` ở bất kỳ đâu ngoài `src/lib/inventory.ts`.** Mọi thay đổi đi qua `moveStock()` và luôn sinh `InventoryMovement` cùng transaction.
3. **`Order` snapshot địa chỉ, không tham chiếu `Address`.** Khách sửa địa chỉ thì đơn cũ không được đổi theo.

## Tiến độ

- [x] **M0 — Nền móng.** Scaffold, schema, token, primitive UI, seed, header storefront.
- [x] **M1 — Storefront đọc.** Trang chủ (hero, dải danh mục, hàng mới về),
      `/san-pham` và `/danh-muc/[slug]` (lọc + sắp xếp + tải thêm + trạng thái
      rỗng/tải/lỗi), `/san-pham/[slug]` (gallery, chọn màu-size, bảng size,
      mục gập, đánh giá, gợi ý), tìm kiếm trên header. Giao diện đối chiếu ảnh
      chụp với `docs/mockup.html`.
- [~] **M2 — Giỏ + checkout + guest/member.** *Đang làm.*
      Xong: giỏ guest bằng cookie `cartToken`, `/gio-hang`, checkout 3 bước,
      đặt đơn COD (transaction trừ tồn qua `moveStock`, mã tăng dần, idempotent),
      trang cảm ơn, `/tra-cuu-don` bằng mã + 4 số cuối SĐT, bảng phí phẳng.
      Thêm: popup mời đăng ký (1 lần/phiên, tự tắt 15s), mã giảm giá đầy đủ
      (gắn vào `Cart.couponId`, tính lại ở server lúc đặt, tăng `usedCount`
      trong cùng transaction), huy hiệu số món trên header.
      Auth.js credentials: `/dang-ky`, `/dang-nhap`, `/tai-khoan` (điểm + đơn),
      gộp giỏ guest khi đăng nhập, ghi `PointEntry` khi đơn PAID **và** DELIVERED.
      Huỷ đơn (hoàn tồn qua `moveStock` + hoàn điểm + trả lượt mã), rate limit
      tra cứu 10/IP/giờ, sổ địa chỉ, header có biến thể member.
      Chưa: màn `/tai-khoan` chưa có UI quản lý sổ địa chỉ. OTP thuộc M7.
- [x] **M3 — Admin lõi.** `/admin` có phân quyền (role trong JWT + `requireStaff`
      ở server + middleware chặn sớm), sidebar 11 mục thu gọn được, `DataTable`
      dùng chung (tab, tìm, sắp xếp, chọn dòng, phân trang — trạng thái trên
      URL), `CsvExportDialog` 4 bước, dashboard, bảng đơn + chi tiết đơn với
      máy trạng thái, bảng sản phẩm + màn sửa kèm bảng biến thể.
      Chưa: thao tác hàng loạt, màn khách hàng. Tạo sản phẩm và quản lý danh
      mục làm ở M3.5.
- [x] **M3.5 — Tạo sản phẩm, biến thể, danh mục.** `/admin/san-pham/moi`,
      khối thêm/xoá biến thể ở màn sửa (SKU sinh tự động từ mã sản phẩm),
      `/admin/danh-muc` đúng màn `cats` của mockup (một bảng gộp danh mục và
      thương hiệu), ô SEO, ô chọn danh mục/thương hiệu ở màn sửa và hai bộ lọc
      trên bảng sản phẩm. Ba chốt ở server:
      biến thể mới luôn tồn 0, không bật bán sản phẩm chưa có biến thể,
      không xoá biến thể đã có lịch sử.
- [x] **M4 — Kho + phiếu nhập.** CI GitHub Actions (Postgres service, test bất
      biến bắt buộc xanh), `/admin/ton-kho` theo SKU với cảnh báo sắp hết,
      `/admin/nhap-kho` tạo nháp + sửa dòng + VAT + **ghi sổ một chiều**,
      phiếu điều chỉnh tồn bắt buộc có lý do.
- [x] **M4.5 — Ảnh sản phẩm lưu trong DB.** Bytes nằm ở bảng riêng
      `ProductImageBlob`, `ProductImage` chỉ giữ thêm `blobId` nên truy vấn
      catalog không bao giờ kéo theo ảnh. Upload ở màn sửa sản phẩm ép về
      WebP dưới 500 KB, cạnh dài tối đa 2000px. `/api/anh/<id>-<checksum>.webp`
      trả `immutable` một năm. Ảnh trùng nội dung dùng chung một blob. Toàn bộ
      chỗ hiển thị đã chuyển sang `next/image`. Chuyển từ `db push` sang
      `prisma migrate deploy`, CI kiểm đúng chuỗi migration mà production chạy.
- [~] **M5 — Hoá đơn + thanh toán.** *Xong phần không cần cổng thanh toán.*
      Hoá đơn GTGT: bản A4 và phiếu nhiệt 80mm, in bằng `@page`, số tiền bằng
      chữ tiếng Việt. Số hoá đơn cấp tuần tự trong transaction đã khoá nên
      không thủng dãy; phát hành lần hai trả về đúng hoá đơn cũ.
      Checkout có ô xuất hoá đơn công ty (VAT) và hai phương thức: COD,
      chuyển khoản ngân hàng. Kế toán xác nhận tiền về bằng tay (chuyển khoản
      không có webhook), mỗi lần bấm để lại một dòng lịch sử.
      Job huỷ đơn trả trước quá hạn ở `/api/cron/huy-don-qua-han`.
      Chưa: VNPay/MoMo/ZaloPay — đợi tài khoản cổng thanh toán.
- [x] **M6 — Khuyến mãi + báo cáo + hỗ trợ.** `/admin/khuyen-mai` (tạo, sửa,
      bật/tắt mã; `usedCount` chỉ đọc), `/admin/bao-cao` (doanh thu 12 tháng,
      giá trị đơn trung bình, bán chạy nhất), `/admin/ho-tro` (hộp thư và
      trả lời khách). Storefront có `/ho-tro` — form liên hệ tự thiết kế,
      sửa luôn ba link chết ở footer từ M1.
- [x] **M6.17 — Chín khuyến nghị sau lượt chấm điểm.** **Tồn kho tách theo
      từng kho** (`StockLevel` + chuyển kho, giữ `Variant.stock` làm tổng nên
      không nơi nào đang đọc nó phải sửa). Cache tầng dữ liệu catalog theo nhãn
      — production 30–60ms so với 300–690ms ở dev. Rate limit dùng Redis khi có
      `REDIS_URL`. `AUTH_SECRET` thật và **thiếu là dừng ngay lúc khởi động**;
      mật khẩu seed sinh ngẫu nhiên, in một lần. Thêm: nhắn tiếp trong cùng yêu
      cầu hỗ trợ · thao tác hàng loạt trên bảng đơn · báo cáo chọn khoảng ngày ·
      đích chạm ≥44px ở quản trị mobile · thông báo mã giảm giá thôi đảo màu.
- [x] **M6.16 — Vá nốt sau lượt quét toàn bộ chức năng.** Sửa lỗi nặng nhất:
      **trả hàng không hoàn tồn kho** (`MovementType.RETURN` có trong schema mà
      chưa bao giờ được dùng). Mở đường **tiêu điểm thưởng** đúng như mockup
      hứa. Nối dây cho bốn thứ đã có tầng server mà không màn nào gọi: sửa biến
      thể · sổ kho từng biến thể · khách tra cứu yêu cầu hỗ trợ · lãi gộp từ
      `unitCost`. Nút chuông từ nút chết thành "việc cần làm" đếm từ dữ liệu thật.
- [x] **M6.15 — Quản trị: menu tài khoản, bật/tắt hạng, sắp xếp từng cột.**
      Cụm tài khoản trong khu quản trị xổ xuống (vai trò · về cửa hàng · hồ sơ ·
      đăng xuất). Cài đặt có công tắc **bật/tắt chương trình hạng thành viên** —
      tắt thì hạng biến mất khỏi bốn màn nhưng chi tiêu vẫn ghi nhận. Tám bảng
      quản trị sắp xếp được theo **từng cột**, kể cả cột qua quan hệ và cột tính
      ra (chi tiêu, tồn) — sắp trên toàn bộ dữ liệu chứ không phải trong trang.
- [x] **M6.14 — Menu tài khoản xổ xuống.** Bấm ô tài khoản trên header là thấy
      ngay điểm, hạng, mức còn thiếu để lên hạng, bốn lối tắt và **nút đăng
      xuất** — không phải rời trang đang xem. Mobile: đáy drawer trước đây luôn
      hiện "Đăng nhập / Đăng ký" kể cả khi đã đăng nhập, nay là thông tin tài
      khoản + đăng xuất.
- [x] **M6.13 — Vá và bù sau lượt đóng vai người dùng thật.** Chạy trọn bốn
      kịch bản qua trình duyệt ở mọi vai. Vá **lỗi mất sạch giỏ hàng khi đăng
      nhập**; nối dây cho ba thứ đã có đủ tầng server mà không màn nào gọi tới
      (đánh giá · sổ địa chỉ · khách tự huỷ đơn); dựng lại trang tài khoản đúng
      bốn tab của mockup (thêm **sản phẩm yêu thích**, sửa hồ sơ, đổi mật khẩu);
      thêm `robots.txt`, `sitemap.xml`, JSON-LD, ba trang chính sách thật, thư
      báo trạng thái đơn và phiếu giao hàng in được.
- [x] **M6.12 — Lọc giá bằng thanh kéo.** Thay hai ô "KHOẢNG GIÁ" bằng đúng một
      `<input type="range">` như mockup: nhãn `GIÁ TỐI ĐA — <số>`, bước 10.000,
      **cận trên là giá của sản phẩm đắt nhất đang xem**. Kéo hết sang phải là
      bỏ lọc chứ không giữ một điều kiện chẳng loại được gì.
- [x] **M6.11 — Trang chủ đủ bảy khối = trang giới thiệu.** Mockup **không có**
      màn "Giới thiệu" riêng: `shopNav` ghi `['Giới thiệu','home']`, tức mục ấy
      trỏ về chính trang chủ. Dựng nốt bốn khối còn thiếu — băng-rôn sale, bán
      chạy 30 ngày, lời khách, nhận tin sale — và gỡ ba link chết trỏ vào
      `/gioi-thieu`, một trang chưa bao giờ tồn tại.
- [x] **M6.10 — Mật khẩu.** Đăng ký nhập mật khẩu hai lần (kiểm ở server).
      Quên mật khẩu: `/quen-mat-khau` → thư có đường dẫn → `/dat-lai-mat-khau/
      [token]`, token dùng một lần, hạn 1 giờ, xin cái mới là cái cũ chết.
      Form trả lời **y hệt nhau** dù tài khoản có tồn tại hay không. Đổi mật
      khẩu giết mọi phiên đang mở, kể cả ở máy khác.
- [x] **M6.9 — Gửi email.** Lớp gửi mail chọn nhà cung cấp bằng biến môi
      trường, mặc định `console` (ghi log, chưa gửi). Đã cắm vào năm chỗ:
      mời nhân viên, xác nhận đơn, hoá đơn GTGT, trả lời hỗ trợ, đặt lại
      mật khẩu.
- [x] **M6.8 — Phân quyền theo khả năng.** Ma trận vai trò × khả năng sửa
      được trong Cài đặt; chốt chặn ở server nói theo khả năng chứ không
      theo danh sách vai trò viết cứng. Mời thành viên bằng email (đường dẫn
      có token), bật/tắt/xoá tài khoản. Vá luôn 8 trang quản trị chưa bao
      giờ có chốt riêng.
- [x] **M6.7 — Cài đặt cửa hàng.** `/admin/cai-dat` gom thông tin cửa hàng,
      tài khoản ngân hàng, phí ship, thuế suất, thời gian giữ đơn, **ngưỡng
      phân hạng khách**, ảnh QR chuyển khoản và phân quyền. Những con số này
      trước nằm rải rác
      thành hằng số trong mã.
- [x] **M6.6 — Khách hàng.** `/admin/khach-hang` phân hạng theo chi tiêu 12
      tháng (MỚI · BẠC · VÀNG · KIM CƯƠNG), hồ sơ khách kèm đơn, sổ điểm và
      sổ địa chỉ. Thêm khách tại quầy thì sinh mật khẩu tạm hiện một lần.
- [x] **M6.5 — Giao hàng nhập tay.** Khối Vận chuyển ở chi tiết đơn: chọn hãng,
      nhập mã vận đơn, mỗi lần đổi ghi một dòng lịch sử. Không chuyển sang
      Đang giao được khi chưa có mã (trừ nhận tại cửa hàng). Thay cho việc nối
      API hãng vận chuyển — làm khi có lưu lượng thật.
- [ ] M7 — GHN + OTP *(hoãn: giao hàng đang do admin tự xử lý)*
- [ ] M8 — Kế toán + sàn TMĐT *(hoãn)*

Chi tiết từng milestone: `docs/BUILD-PLAN.md`.

## Tài khoản nội bộ (dev)

`npm run db:seed` tạo sẵn bốn tài khoản, cùng mật khẩu **`admin123456`**:

| SĐT | Vai trò |
|---|---|
| 0900000001 | ADMIN — chủ cửa hàng |
| 0900000002 | STAFF — nhân viên bán hàng |
| 0900000003 | WAREHOUSE — thủ kho |
| 0900000004 | ACCOUNTANT — kế toán |

Đổi `STAFF_PASSWORD` trong `prisma/seed.ts` trước khi dùng thật.

## CI

`.github/workflows/ci.yml` chạy trên GitHub Actions cho mọi PR và mọi lần đẩy
lên `main`: dựng Postgres 17 → `prisma migrate deploy` → `db:seed` →
`typecheck` → `lint` → `test` → `build`.

Dùng `migrate deploy` chứ không `db push`: production chạy đúng chuỗi migration
này, CI phải kiểm chính nó chứ không phải một đường khác.

Test đụng DB thật nên không mock được — đó là lý do phải có service Postgres.
Trong `npm test` có bất biến `stock === Σ(movements.delta)`, thứ mà
`docs/BUILD-PLAN.md` bắt buộc phải xanh trước khi merge từ M4.

## Ghi sổ kho là một chiều

Phiếu nhập `POSTED` **không sửa, không ghi lại, không xoá**. Sai thì lập phiếu
điều chỉnh tồn — đúng `docs/CLAUDE-rules.md`.

Chống ghi hai lần bằng `UPDATE ... WHERE status = 'DRAFT'` ngay trong
transaction rồi kiểm `count`. Chỉ `SELECT` trước là không đủ: hai request song
song có thể cùng đọc thấy `DRAFT` rồi cùng cộng tồn.

`tests/receipts.test.ts` khoá: ghi sổ phiếu 4 dòng cộng đúng từng SKU, ghi lần
hai bị chặn và **không** cộng thêm, phiếu rỗng không ghi được, VAT 8% ra số
nguyên, điều chỉnh không cho tồn xuống dưới 0.

## Ảnh sản phẩm nằm trong Postgres

`docs/ARCHITECTURE.md` chốt UploadThing hoặc R2. Giai đoạn thử nghiệm cố ý làm
khác: bớt một nhà cung cấp, bớt một chỗ có thể rò khoá, và bản `pg_dump` là bản
sao lưu đầy đủ chứ không phải một nửa.

Ba thứ giữ cho nó không đắt:

1. **Bytes ở bảng riêng.** `ProductImageBlob` tách khỏi `ProductImage`, nên mọi
   truy vấn catalog chỉ đọc cột `url` — một trang 12 sản phẩm không bao giờ
   thành hàng chục MB.
2. **URL là nội dung.** `/api/anh/<id>-<checksum>.webp` đổi khi và chỉ khi ảnh
   đổi, nhờ vậy route trả `immutable` một năm và CDN gánh gần hết. Không có
   header này thì mỗi lượt xem là một lần chạy hàm cộng một truy vấn DB, và lúc
   đó lưu ảnh trong DB đúng là lựa chọn tệ.
3. **Nén trước khi lưu.** WebP, cạnh dài ≤ 2000px, ≤ 500 KB. Hạ chất lượng
   trước; ảnh nào hạ hết nấc vẫn nặng thì thu nhỏ tới khi đạt, tới `MIN_EDGE`
   vẫn không đạt thì từ chối. Ảnh trùng nội dung dùng chung blob đã có.

Cột `url` giữ nguyên kiểu chuỗi và mọi chỗ hiển thị chỉ đọc nó, nên **đường
thoát** rẻ: đọc từng blob → đẩy lên R2 → ghi `ProductImage.url` thành URL R2 →
xoá bảng blob. Không đụng một dòng UI nào.

`tests/images.test.ts` khoá: chặn file quá lớn và định dạng lạ, chặn cả file
không phải ảnh dù khai `image/png`; thu đúng 2000px mà không bóp méo tỉ lệ;
không phóng to ảnh nhỏ; ảnh nhiễu dày vẫn lọt dưới 500 KB nhờ thu nhỏ; nội dung
khác thì URL khác, trùng thì dùng lại blob; gỡ ảnh này không làm hỏng ảnh khác
đang dùng chung blob, và blob hết người dùng thì bị dọn.

## Hoá đơn: số đã cấp thì không rút lại

Cơ quan thuế đọc dãy số hoá đơn liên tục. Cấp số 5 rồi bỏ, sau đó cấp số 6, là
phải giải trình. Nên:

- Số chỉ được cấp bên trong transaction đã giữ `pg_advisory_xact_lock` theo ký
  hiệu. Chỉ `SELECT max + 1` là hai kế toán bấm cùng lúc sẽ cùng đọc ra số cũ,
  một người đâm ràng buộc `@@unique` và **mất luôn số vừa định cấp**.
- Không có đường nào xoá hay sửa hoá đơn. Phát hành lần hai cho cùng một đơn
  trả về đúng hoá đơn cũ — bấm hai lần hay tải lại trang đều vô hại.
- Ký hiệu `1C26TMS` mang hai chữ số cuối của năm, nên `number` chỉ duy nhất
  *trong* một ký hiệu và mỗi năm đánh lại từ 1.

VAT tách từ tổng **đã gồm thuế** bằng `splitVat`, thứ bảo đảm `net + vat === gross`
tuyệt đối trên `Int` đồng. Giá bán lẻ ở Việt Nam đã gồm thuế, nên các dòng hàng in
theo giá gồm thuế và tiền thuế hiện ở dòng “trong đó” — tính riêng từng dòng rồi
cộng lại là có ngày lệch một đồng, và một đồng lệch là hoá đơn phải huỷ.

`tests/invoices.test.ts` và `tests/doc-so.test.ts` khoá: bốn đơn phát hành đồng thời
ra bốn số liên tiếp không trùng; phát hành lần hai không cấp thêm số; đơn đã huỷ thì
không phát hành; `net + vat` luôn bằng tổng đơn ở mọi mức tiền; và từng luật đọc số
(mười lăm / hai mươi lăm, hai mươi mốt, hai mươi tư, “không trăm”, “lẻ”).

## Giữ đơn chưa thanh toán 2 giờ

`docs/BUILD-PLAN.md` viết 30 phút, mockup `orderFail` hứa với khách “đơn vẫn được
giữ trong 2 giờ”. Lấy theo mockup: huỷ ở phút 30 trong khi màn hình vừa hứa 2 tiếng
là tự tạo một lời nói dối, và giữ tồn thêm 90 phút rẻ hơn nhiều so với một khách
quay lại thấy đơn biến mất.

Chỉ đơn **trả trước** bị quét. Đơn COD chưa trả tiền là bình thường cho tới lúc giao;
gom chung là mỗi đêm tự huỷ sạch đơn đang chờ giao.

Huỷ đi qua `cancelOrder` chứ không `UPDATE status` thẳng — còn phải hoàn tồn qua
`moveStock`, trả lượt mã giảm giá và hoàn điểm.

```bash
# cron mỗi 10 phút
curl -fsS -H "Authorization: Bearer $CRON_SECRET" \
     https://menstylehouse.vn/api/cron/huy-don-qua-han
```

## Tạo sản phẩm mà không phá sổ kho

Form thêm biến thể **không có ô tồn kho** và sẽ không bao giờ có. Mockup desktop
vẽ một ô nhập tồn ở màn sửa sản phẩm; làm theo là phá luật số 2 — tồn chỉ đổi qua
`moveStock` và luôn kèm một dòng sổ. Biến thể mới bắt đầu ở 0, hàng vào bằng phiếu
nhập kho.

Hai chốt còn lại, đều kiểm ở server chứ không ẩn nút:

- **Không bật bán sản phẩm chưa có biến thể.** Khách bấm vào chỉ thấy một trang
  không chọn được size, không thêm giỏ được — tệ hơn là không thấy sản phẩm đó.
- **Không xoá biến thể đã có lịch sử** — còn tồn, có dòng sổ, đã nằm trong đơn,
  hay đang trong giỏ của khách. Xoá là làm mồ côi `InventoryMovement`.

`Product.code` (`MSH-141`) là một cột thật chứ không phải mẩu chữ moi ra từ tên:
SKU của mọi biến thể dựng từ nó, nên đổi tên sản phẩm không được làm đổi SKU đã in
trên tem và đã snapshot trong đơn cũ. Mã mới lấy số lớn nhất đang có cộng một —
đếm số lượng sản phẩm thì xoá một cái là mã quay lại đụng mã cũ.

Sidebar theo đúng `navItems` của mockup, trong đó có mục **Danh mục & thương hiệu**.
Chỗ tách khỏi mockup là gộp “Kho”: mockup một mục, ở đây tách `Tồn kho` và
`Nhập kho` vì hai màn khác quyền — ghi sổ phiếu nhập là thao tác một chiều chỉ thủ
kho và quản trị được làm.

Slug danh mục **không đổi theo tên**. Slug nằm trong URL công khai
`/danh-muc/<slug>` và trong link khách đã lưu; kéo nó theo tên là làm chết link cũ
một cách âm thầm.

## Phân hạng khách: ngưỡng là số khách đếm

Ngưỡng do cửa hàng đặt ở `/admin/cai-dat`, dùng dấu **lớn hơn chặt**: tiêu
đúng ngưỡng vẫn chưa lên hạng. Sai một dấu `=` là
hàng nghìn khách nhảy hạng sai, nên `tests/customers.test.ts` khoá từng biên một.

Chi tiêu đếm **cùng luật với báo cáo doanh thu** — bỏ đơn huỷ và đơn trả hàng,
trong 12 tháng gần nhất. Hai chỗ đếm khác nhau thì kế toán và nhân viên bán hàng
sẽ cãi nhau về cùng một con số.

Màn quản trị **không** có chỗ xem hay đổi mật khẩu của khách. Thêm khách tại quầy
thì hệ thống sinh mật khẩu tạm và hiện đúng một lần để nhân viên đọc; quên thì tạo
lại, chứ tra ra được mật khẩu cũ nghĩa là hệ thống đang giữ nó ở dạng đọc được.

## Phân quyền: ẩn nút không phải là kiểm soát

Quyền nói theo **khả năng** (`kho.ghi-so`, `hoa-don.phat-hanh`), không theo vai
trò. Danh mục khả năng khai cố định trong `src/lib/permissions.ts` — mỗi khoá ứng
với một `requirePermission` có thật ở trang và `assertPermission` ở Server Action.
Vai trò nào làm được gì là dữ liệu sửa trong `/admin/cai-dat`.

Bốn chốt an toàn:

- **Chủ cửa hàng luôn có mọi quyền**, chốt trong `canDo` chứ không phải dữ liệu.
  Gỡ đúng `phan-quyen.quan-ly` là không còn ai vào sửa lại được.
- **Không hạ hay tắt người quản trị cuối cùng.** Quản trị đã tắt không tính là
  người còn lại.
- **Tài khoản tắt bị chặn ngay ở lần tải trang kế tiếp** — guard đọc lại `active`
  từ DB mỗi lần, không tin JWT. Từ M6.10 chốt này nằm ngay trong callback `jwt`
  nên áp cho **cả khách hàng**, không riêng khu quản trị (xem *Thu hồi phiên*).
- **Không xoá người đã phát hành hoá đơn**, chỉ tắt.

Nhân viên đăng nhập xong rơi vào `/tai-khoan` như mọi người, nên có **lối sang khu
quản trị** ở ba chỗ: nút QUẢN TRỊ trên header, mục đầu drawer mobile, và một khối
ngay đầu trang tài khoản. Mockup không có lối này — thanh CỬA HÀNG/QUẢN TRỊ trong
mockup là chrome của chính bản prototype, không phải chức năng của cửa hàng.

`tests/permissions.test.ts` **quét mã nguồn**: mọi trang trong `src/app/admin`
trừ bảng tổng quan đều phải gọi `requirePermission`, và mọi mục sidebar trừ Tổng
quan đều phải khai khả năng. Thêm trang mới mà quên chốt là test đỏ ngay — đó là
cách tám trang hở từ M3 bị phát hiện.

## Trang tài khoản: bốn tab

Đúng `accountTabs` của mockup — **Lịch sử đơn hàng · Hồ sơ · Sổ địa chỉ · Sản
phẩm yêu thích**. Tab chọn bằng query string (`?tab=ho-so`) chứ không phải trạng
thái client: gửi link cho người khác vẫn mở đúng tab, và bấm Back vẫn lùi đúng chỗ.

- **Huỷ đơn** ngay ở lịch sử đơn khi đơn còn `PENDING`/`CONFIRMED`. Action kiểm
  đơn có đúng của người đang đăng nhập không trước khi gọi `cancelOrder` — hàm
  đó chỉ nhận mã đơn, gọi thẳng là ai biết mã đơn người khác cũng huỷ được.
- **Đổi mật khẩu** bắt nhập mật khẩu hiện tại (không hỏi thì ai mượn được máy
  đang mở sẵn phiên là chiếm luôn tài khoản), và đổi xong đẩy `sessionsValidFrom`
  nên mọi thiết bị khác bị đăng xuất.
- **Sổ địa chỉ** dùng chung danh sách tỉnh với bước thanh toán (`lib/dia-gioi`),
  để địa chỉ đã lưu không mang tên tỉnh mà ô ở thanh toán không có.

## Tồn kho theo từng kho

`StockLevel(variantId, warehouseId, qty)` giữ tồn từng kho, còn **`Variant.stock`
vẫn là tổng của mọi kho**. Nhờ vậy mọi nơi đang đọc `stock` — giỏ hàng, đặt đơn,
trang sản phẩm, bất biến `stock === Σ(movements.delta)` — không phải sửa một dòng
nào, và cửa hàng chỉ có một kho chạy y như cũ.

`moveStock` nhận thêm `warehouseId` **không bắt buộc**: bỏ trống thì vào kho
chính. Chuyển kho sinh **hai dòng sổ** `TRANSFER` (âm ở kho đi, dương ở kho đến)
nên tổng không đổi; một dòng duy nhất thì sổ từng kho không đọc được hàng đi đâu.

Bất biến thứ hai `auditWarehouse()`: `Variant.stock` phải bằng tổng mọi kho.
Tách khỏi `auditStock()` vì hai kiểu hỏng khác nhau — sổ lệch là ai đó ghi thẳng
vào `stock`, tổng kho lệch là một lối gọi `moveStock` quên cập nhật `StockLevel`.

## Bí mật và mật khẩu

`AUTH_SECRET` **thiếu là `auth.ts` ném lỗi ngay lúc khởi động** — chạy tiếp với
khoá mặc định nghĩa là mọi phiên ký bằng một khoá ai cũng đoán được, và không có
gì báo cho ai biết.

Mật khẩu bốn tài khoản seed lấy từ `SEED_PASSWORD`; không đặt thì **sinh ngẫu
nhiên và in ra đúng một lần** rồi thôi. Bản trước viết cứng `admin123456` trong
mã, tức mọi bản triển khai đều có bốn tài khoản quản trị dùng chung một mật khẩu
ai đọc repo cũng biết.

## Rate limit

Dùng Redis khi có `REDIS_URL`, không có thì đếm trong RAM và **nói rõ ở log lúc
khởi động**. Bắt buộc phải có Redis mới chạy được thì dựng máy dev cũng phải cài
Redis; nên giữ đường lui, chỉ không giữ im lặng.

Redis chết giữa chừng thì rơi về RAM chứ **không chặn người dùng** — giới hạn tần
suất là lớp bảo vệ, không phải cửa chính. Chặn hết vì Redis rớt là tự khoá cửa hàng.

## Trả hàng

Ghi nhận trả hàng làm **bốn việc trong một transaction**: hàng về kho qua
`moveStock` (kiểu `RETURN`), thu hồi điểm đã cộng, trả lại điểm khách đã tiêu,
và đánh dấu đã hoàn tiền.

**Không trả lại lượt dùng mã giảm giá** — khác đơn huỷ: khách đã mua thật rồi
mới trả, trả lượt là mở đường dùng một mã vô hạn bằng cách mua rồi trả.

## Dùng điểm trừ vào tiền đơn

Ba chốt, lấy cái nhỏ nhất: số điểm đang có · trần phần trăm tiền hàng (đặt trong
Cài đặt, mặc định 50%) · và chính tiền hàng. **Điểm không trừ vào phí giao** —
đó là tiền cửa hàng trả cho bên thứ ba.

Server tính lại từ số dư thật; số client gửi chỉ là ý muốn. Xin quá thì **cắt về
mức cho phép chứ không báo lỗi**: khách để giỏ vài ngày rồi quay lại, điểm có thể
đã đổi vì một đơn khác vừa giao xong.

## Sắp xếp bảng quản trị

Ba loại cột, ba cách xử lý:

- **Cột thật** — Postgres sắp, cắt trang trong SQL.
- **Cột qua quan hệ** — `{ product: { name } }`, `{ category: { name } }`,
  `{ variants: { _count } }`. Mỗi cột giữ một mệnh đề `orderBy` trọn vẹn chứ
  không chỉ tên trường, vì "MÀU · SIZE" phải sắp theo màu rồi tới size.
- **Cột tính ra** (chi tiêu / số đơn / hạng khách, tồn của sản phẩm) — **lấy hết,
  tính, sắp, rồi mới cắt trang**. Cắt trang trước rồi sắp trong 20 dòng đang hiện
  cho ra bảng trông đúng nhưng không đưa khách chi nhiều nhất lên đầu, mà nhìn
  thì không phân biệt được.

Trạng thái đơn và hạng khách sắp theo **thứ bậc**, không theo bảng chữ cái: theo
chữ cái thì "Đã giao" nằm cạnh "Đã huỷ" và "BẠC" đứng trước "MỚI".

## Bật/tắt hạng thành viên

Công tắc trong `/admin/cai-dat`. Tắt thì hạng biến mất khỏi trang tài khoản, menu
tài khoản, bảng khách hàng (mất cả cột) và hồ sơ khách. **Chi tiêu vẫn được ghi
nhận** — tắt là ngừng hiển thị, không phải ngừng đếm, nên bật lại lúc nào cũng có
sẵn số. Khi tắt thì ba ngưỡng cũng thôi bị bắt tăng dần, vì chúng không còn nghĩa.

## Đánh giá: chỉ người đã mua

Kiểm bằng số điện thoại đặt hàng — phải có một đơn `DELIVERED` chứa đúng sản
phẩm. Không kiểm thì trang sản phẩm thành bảng tin ai viết gì cũng được, và con
số 4.8/5 ngoài trang chủ mất sạch ý nghĩa. Một đơn một đánh giá, và vào **hàng
chờ duyệt** — lọt thẳng lên trang là vô hiệu hoá cả màn duyệt đã dựng ở M2.

## Trang chủ cũng là trang giới thiệu

Mockup không có màn "Giới thiệu" riêng. `shopNav` của mockup ghi thẳng
`['Giới thiệu','home']`, và footer cũng vậy (`['Giới thiệu cửa hàng','home']`) —
tức phần giới thiệu cửa hàng **là** trang chủ. Trước M6.11 ba link đó trỏ vào
`/gioi-thieu`, một trang chưa bao giờ tồn tại: bấm vào là ra 404.

Bảy khối kể một mạch: cửa hàng bán gì (hero) → bán những nhóm nào (danh mục) →
hàng mới → đang có ưu đãi gì → cái gì bán chạy → khách nói gì → để lại email.

**Khối nào không có dữ liệu thì biến mất**, không hiện ô trống hay số 0. Cửa hàng
mới mở chưa có đơn và chưa có đánh giá thì trang chủ ngắn lại, thế là đúng.

Ba luật chống nói dối trên trang chủ — đây là chỗ khách tin nhất:

- **Số "đã bán" đếm cùng danh sách trạng thái với báo cáo doanh thu**
  (`TINH_DA_BAN` trong `src/lib/order-status.ts`, dùng chung cho cả hai). Đếm cả
  đơn huỷ thì trang chủ ghi bán 120 còn báo cáo ghi 96, và không ai giải thích
  được. Nhãn ghi "30 NGÀY QUA" nên cửa sổ đúng là 30 ngày.
- **Băng-rôn sale chỉ hiện mã gõ vào là ăn.** Mã hết lượt, hết hạn, chưa tới
  ngày, hoặc chỉ dành cho thành viên đều không lên — băng-rôn này khách vãng lai
  cũng nhìn thấy. Lấy mã sắp hết hạn nhất, và tự biến mất khi mã hết hạn.
- **Lời khách chỉ lấy đánh giá đã duyệt, từ 4 sao trở lên.** Đã có màn duyệt
  riêng ở admin; lọt lên trang chủ trước khi duyệt là vô hiệu hoá cả khâu duyệt.
  Lời dưới 30 ký tự bị bỏ — chiếm chỗ mà không nói được gì.

Ô nhận tin lưu vào `NewsletterSubscriber` thật, không phải nút bấm cho có. Đăng
ký trùng email **không phải lỗi**: người ta gõ, bấm, thấy im ru thì bấm lại —
báo đỏ "email đã đăng ký" là mắng khách vì một việc họ làm đúng. Huỷ nhận tin là
đánh dấu chứ không xoá dòng, để còn giữ dấu vết là họ từng bảo đừng gửi nữa.

Cùng lúc sửa một lỗi từ M1: mọi lưới sản phẩm dùng kẻ chỉ 1px, còn mockup dùng
`gap:24px` với thẻ **không có nền riêng** và chữ thẳng hàng mép ảnh. Cái sai được
`docs/RESPONSIVE.md` ghi lại thành quy tắc, rồi chú thích trong mã dẫn ngược về
tài liệu — đọc mã thấy khớp tài liệu nên không ai nghi. Đã sửa cả ba chỗ.

Một chỗ **cố ý lệch mockup**: link "Tuyển dụng" ở footer, mockup thả về trang
chủ, ở đây trỏ sang `/ho-tro` như ba link chính sách. Trang chủ không trả lời
được câu hỏi mà người ta bấm vào để hỏi.

## Gửi email

```bash
MAIL_PROVIDER="console"   # console = ghi log, KHÔNG gửi. Đổi thành "resend" khi có khoá
MAIL_FROM="Men Style House <no-reply@menstylehouse.vn>"
RESEND_API_KEY=""
APP_URL="http://localhost:3000"   # dựng link tuyệt đối trong mail
```

Bật gửi thật: điền `RESEND_API_KEY`, đổi `MAIL_PROVIDER=resend`, đặt `APP_URL`
thành tên miền thật. Không phải sửa dòng mã nào.

**Mặc định là `console` có chủ ý.** Chưa có khoá thì phải thấy rõ là chưa gửi —
thư in đầy đủ ra log để dev đọc là biết khách lẽ ra nhận được gì. Giá trị lạ cũng
rơi về `console`. Báo “đã gửi” trong khi không có gì rời máy là kiểu hỏng tệ nhất:
cửa hàng tưởng khách đã nhận hoá đơn.

**Mail hỏng không làm hỏng việc chính.** `guiMail` không ném lỗi, chỉ trả kết quả
và ghi log. Đường đặt đơn bọc thêm try/catch riêng: đơn đã nằm trong DB rồi, lỗi
mail mà kéo theo lỗi ở đó thì khách thấy “không đặt được đơn” rồi đặt lại thành
hai đơn.

Năm loại thư đang gửi: mời nhân viên · xác nhận đơn · hoá đơn GTGT · trả lời hỗ
trợ · đặt lại mật khẩu.

## Mật khẩu

Đăng ký bắt **nhập lại mật khẩu**, và kiểm ở server chứ không chỉ ngoài trình
duyệt. Gõ lệch một ký tự mà vẫn tạo được tài khoản là khách tự khoá mình ra ngoài
ngay từ ngày đầu, mà không biết vì sao.

Quên mật khẩu đi qua `PasswordReset`. Ba luật, mỗi luật hỏng là mất tài khoản chứ
không phải hiển thị xấu:

- **Không tiết lộ tài khoản có tồn tại hay không.** `/quen-mat-khau` trả về đúng
  một câu, dù tìm thấy hay không, kể cả khi lỗi kỹ thuật. Trả lời khác nhau là
  biến form thành máy dò: gõ lần lượt vài nghìn số là biết số nào có tài khoản.
- **Token dùng một lần, hạn 1 giờ.** Ngắn hơn lời mời nhân viên (7 ngày) rất
  nhiều — lời mời là thứ người ta đang chờ, còn token này là chìa vào một tài
  khoản đã có. Hạn và trạng thái kiểm **lại bên trong transaction**, vì giữa lúc
  mở trang và lúc bấm nút token có thể đã chết.
- **Xin cái mới là cái cũ chết.** Bấm “gửi lại” vài lần không rải ra vài cái chìa
  cùng mở một cửa.

Thêm hai chốt: tài khoản `active = false` không lấy lại được mật khẩu (tắt tài
khoản là để chặn người đó vào — cho đặt lại là mở lại cửa), và mật khẩu mới tối
thiểu **8 ký tự**, chặt hơn mức 6 lúc đăng ký. Form giới hạn 5 lượt/IP/giờ vì mỗi
lượt là một email rời khỏi hệ thống.

### Thu hồi phiên

Đổi mật khẩu **giết mọi phiên đang mở**, kể cả ở máy khác. Người đi đặt lại mật
khẩu thường vì nghi có kẻ vào được tài khoản; đổi mật khẩu mà để phiên cũ sống
tiếp thì kẻ đó vẫn ngồi nguyên bên trong, và việc đổi coi như không có tác dụng.

Không có bảng session để xoá từng dòng, và đó **không phải lựa chọn**: Auth.js
chỉ cho dùng phiên lưu DB với provider bên ngoài, còn `credentials` (số điện
thoại + mật khẩu, thứ cửa hàng đang dùng) bắt buộc dùng JWT.

Nên làm theo mốc: mỗi người có `User.sessionsValidFrom`, token phát trước mốc coi
như chết. `datLaiMatKhau` đẩy mốc lên **trong cùng transaction** với mật khẩu.
Callback `jwt` đọc lại `active` + mốc từ DB mỗi lượt (bọc `cache()` nên một
request chỉ tra một lần) và trả `null` khi hỏng — trả `null` là Auth.js xoá cookie
phiên. Vai trò cũng đọc lại luôn, nên đổi vai trò có hiệu lực ở lượt tải kế tiếp.

Một chi tiết dễ tự bắn vào chân: `iat` trong JWT chỉ mịn tới **giây**, còn mốc có
mili-giây. So nguyên mili-giây thì đổi mật khẩu lúc `12:00:00.700` rồi đăng nhập
lại lúc `12:00:00.900` sẽ cho token `iat = 12:00:00` — nhỏ hơn mốc, và người vừa
đổi mật khẩu bị đá ra ngay tại giây họ đăng nhập. `phienConSong` cắt cả hai về
giây; đổi lại, token phát trong **cùng giây** với lúc đổi mật khẩu sống sót. Cửa
sổ đó rộng một giây và đáng đánh đổi hơn là tự đá người dùng ra.

Middleware **không** kiểm chỗ này (chạy ở edge, không có DB) — nó chỉ chặn sớm
cho đỡ tốn công render. Chốt thật nằm ở `auth()` trong trang và Server Action.

**Lần triển khai đầu sẽ đá mọi phiên đang mở ra một lần**, vì migration đặt mốc
bằng thời điểm chạy migration. Đăng nhập lại là xong.
