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

## M3.5 — Tạo sản phẩm, biến thể và danh mục

Chèn giữa M3 và M4 để không phải đánh số lại. **Vừa là khe hở trong kế hoạch, vừa
là chỗ tôi làm thiếu so với mockup.** M3 viết “bảng sản phẩm, màn sửa sản phẩm” — chữ *sửa*, không
có *thêm*. Còn mockup thì **có sẵn** mục sidebar `['cats','Danh mục & thương hiệu']`
và một màn `cats` dựng bằng `DataTable` — tôi đã bỏ sót ở M3. Nên tới hết M5 vẫn
chưa ai tạo được sản phẩm mới, và danh mục thì chỉ
có 8 cái do seed đặt.

- `/admin/san-pham/moi` + nút “+ THÊM SẢN PHẨM”. `DataTable` đã có sẵn chỗ cho
  nút hành động chính từ M3, chỉ là chưa trang nào truyền vào.
- Khối quản lý biến thể ở màn sửa: thêm, xoá, sinh SKU tự động.
- `/admin/danh-muc` dựng đúng màn `cats` của mockup: **một** bảng `DataTable` gộp
  cả danh mục lẫn thương hiệu, cột Tên · Loại · Số sản phẩm · Trạng thái.
- Ô chọn danh mục và thương hiệu ở màn sửa (mockup `pedit` có bốn ô: tên, danh
  mục, thương hiệu, giá), và hai bộ lọc Danh mục/Thương hiệu trên bảng sản phẩm.
- Ô SEO ở màn sửa (mockup `aProductEdit` có, tôi làm thiếu ở M3).
- Cột `Product.code` (`MSH-141`). SKU dựng từ nó nên nó phải là cột thật, không
  phải mẩu chữ moi ra từ `name` — đổi tên sản phẩm không được đổi SKU đã in tem.

**Ba chốt chặn ở server, không phải ẩn nút:**

1. **Form biến thể không có ô tồn kho.** Biến thể mới luôn bắt đầu ở 0; hàng vào
   bằng phiếu nhập. Cho khai tồn ban đầu là sinh ra hàng mà sổ không có dòng nào
   giải thích — phá thẳng luật số 2.
2. **Không bật bán sản phẩm chưa có biến thể.** Khách bấm vào chỉ thấy trang không
   chọn được size, không thêm giỏ được.
3. **Không xoá biến thể đã có lịch sử** (còn tồn, có dòng sổ, đã bán, đang trong
   giỏ). Xoá là làm mồ côi `InventoryMovement` và bất biến kho hết kiểm được.

Slug danh mục **không đổi theo tên**: nó nằm trong URL công khai `/danh-muc/<slug>`
và trong link khách đã lưu.

**Xong khi:** tạo được một sản phẩm mới từ đầu tới lúc nó hiện trên storefront mà
không phải đụng vào DB.

## M4 — Kho + phiếu nhập
- Màn tồn kho theo SKU, cảnh báo sắp hết.
- Phiếu nhập kho: tạo nháp, sửa dòng hàng, tính VAT, **ghi sổ một chiều** sinh `InventoryMovement`.
- Phiếu điều chỉnh tồn.
- **Test bất biến:** với mọi variant, `stock === sum(movements.delta)`. Test này phải chạy trong CI.

**Xong khi:** ghi sổ một phiếu 4 dòng thì tồn kho ở màn sản phẩm đổi đúng, và ghi sổ lần hai bị chặn.

## M4.5 — Ảnh sản phẩm lưu trong DB

Chèn giữa M4 và M5 để không phải đánh số lại các milestone sau.

**Quyết định tạm cho giai đoạn thử nghiệm.** `ARCHITECTURE.md` chốt UploadThing hoặc Cloudflare R2; ở đây cố ý làm khác để bớt một nhà cung cấp và bớt chỗ có thể rò khoá. Ghi lý do vào README, kèm đường thoát bên dưới.

- **Migration đầu tiên.** Đang dùng `db push`, chạy lên DB có dữ liệu thật là có ngày mất cột. Sinh `prisma/migrations/` rồi đổi CI và deploy sang `prisma migrate deploy`.
- **Bảng `ProductImageBlob` tách riêng**, `ProductImage` chỉ thêm `blobId`. Giữ nguyên cột `url` — mọi chỗ hiển thị vẫn đọc `url`, nhờ đó đổi sang R2 sau này không phải sửa UI.
- **Route `/api/anh/[id]`** trả bytes kèm `Cache-Control: public, max-age=31536000, immutable`. URL mang checksum để đổi ảnh là đổi URL.
- **Upload ở màn sửa sản phẩm** — hiện chưa có luồng nào thêm ảnh, ảnh đang do seed đặt cứng URL Unsplash. Ép về WebP, giới hạn ~2000px và ~500 KB mỗi ảnh, tính checksum khi lưu.
- Đổi `next.config.ts` và thay `<img>` bằng `next/image` ở 8 file đang dùng thẻ thường.

**Xong khi:** upload được ảnh trong admin, ảnh hiện đúng trên storefront, đổi ảnh thì URL đổi theo checksum và trình duyệt lấy bản mới.

**Đã xong.** Bốn chỗ chỉ lộ ra khi chạy thật, ghi lại để khỏi vấp lại:

1. **Server Action mặc định chỉ nhận 1 MB.** Form upload im lặng không phản hồi với ảnh 1,7 MB — Next chặn trước khi tới chỗ kiểm tra của mình. `experimental.serverActions.bodySizeLimit` phải khớp `MAX_UPLOAD_BYTES`.
2. **Hai bản `sharp` trong một tiến trình là DLL xung đột.** Next kéo `sharp@0.34` cho `next/image`, dự án cài `sharp@0.35` → `ERR_DLOPEN_FAILED`, và vì `/api/anh/[key]` import chung module với hàm nén nên route *đọc* ảnh chết theo. Gộp về một phiên bản, và nạp `sharp` động trong `toWebp` để đường đọc không đụng tới nó.
3. **`@unique` trên `blobId` vô hiệu hoá chính tính năng dùng lại blob.** Dedupe theo checksum chỉ có ích khi nhiều ảnh trỏ chung một blob; ràng buộc 1-1 làm ảnh thứ hai chết. Đổi sang nhiều-một, và dọn blob mồ côi bằng `images: { none: {} }` chứ không xoá theo id.
4. **Lưới một cột co theo max-content.** Sản phẩm từ 5 ảnh trở lên làm dải thumbnail kéo trang tràn ngang trên điện thoại — lỗi có sẵn từ M1 nhưng seed chỉ đặt 3 ảnh nên chưa ai thấy. `grid-cols-1` cho ra `minmax(0, 1fr)` và hết tràn.

Ảnh nhiễu dày (ảnh scan, ảnh nhiều hạt) hạ chất lượng không xuống nổi 500 KB, nên `toWebp` ước lượng tỉ lệ cần thu từ số byte đo được rồi thu nhỏ thẳng tới đó. Tới `MIN_EDGE = 600` vẫn quá nặng thì từ chối hẳn (`ImageTooDenseError`) — nuốt một blob vài MB vào Postgres đúng là thứ M4.5 sinh ra để chặn.

**Đường thoát khi hết thử nghiệm:** đọc từng `ProductImageBlob` → đẩy lên R2 → ghi `ProductImage.url` thành URL R2 → xoá bảng blob. Không đụng tới UI.

## M5 — Hoá đơn + thanh toán online
- Hoá đơn GTGT: tạo từ đơn, bản in A4 và bản in 80mm bằng CSS `@page`.
- Tích hợp VNPay (sandbox → production), webhook idempotent, đối chiếu số tiền.
- Job huỷ đơn chưa thanh toán quá 30 phút.

**Xong khi:** thanh toán VNPay sandbox thành công thì đơn tự chuyển `PAID`; gọi lại webhook không tạo hiệu ứng phụ.

**Đã làm M5a — hoá đơn và thanh toán không qua cổng.** VNPay tạm gác vì chưa có
tài khoản cổng thanh toán; bày một lựa chọn bấm vào không đi tới đâu còn tệ hơn
là chưa bày, nên enum `paymentMethod` ở `checkoutSchema` **chỉ nhận** `COD` và
`BANK_TRANSFER` — gọi thẳng API với `VNPAY` cũng không tạo được đơn treo.

- Hoá đơn GTGT: bản A4 794px và phiếu nhiệt 80mm 302px đúng mockup `aInvoice`,
  in bằng `@page` đổi khổ theo bản đang xem. Số tiền bằng chữ ở `src/lib/doc-so.ts`.
- Số hoá đơn cấp trong transaction có `pg_advisory_xact_lock` theo ký hiệu. Chỉ
  `SELECT max + 1` là hai kế toán bấm cùng lúc sẽ đâm ràng buộc và **thủng dãy số** —
  thứ cơ quan thuế bắt giải trình. Phát hành lần hai trả về đúng hoá đơn cũ.
- Chuyển khoản không có webhook nên xác nhận bằng người, mỗi lần bấm để lại một
  `OrderEvent`. Bấm hai lần không sinh thêm `Payment`.
- Job huỷ đơn quá hạn ở `/api/cron/huy-don-qua-han`, chặn bằng `CRON_SECRET` và
  đi qua `cancelOrder` để hoàn tồn bằng `moveStock`.

**Lệch BUILD-PLAN có chủ ý:** giữ đơn **2 giờ** chứ không 30 phút. Mockup `orderFail`
hứa thẳng với khách “đơn vẫn được giữ trong 2 giờ”; huỷ ở phút 30 là tự tạo một
lời nói dối trên màn hình. Chỉ đơn **trả trước** mới bị quét — gom cả COD vào là mỗi
đêm tự huỷ sạch đơn đang chờ giao.

**Ba lỗi lộ ra khi chạy thật, ghi lại để khỏi vấp lại:**

1. **Lỗi hợp lệ render trong bước đang ẩn.** Các bước checkout ẩn nhau bằng CSS, nên
   lỗi của trường ở bước 1 vẫn được render — trong khối `hidden`. Khách bấm Đặt đơn ở
   bước 3, server chặn, màn hình không nhúc nhích. Danh sách trường kéo về bước 1 phải
   gồm cả các ô hoá đơn VAT.
2. **React 19 tự reset `<form action>` sau mỗi action.** Với input không điều khiển, một
   lỗi hợp lệ là xoá trắng mọi thứ khách vừa gõ. Action phải trả `values` về và form
   dùng nó làm `defaultValue`, kèm `key` đổi theo để React gắn lại ô. Lỗi này có từ M2.
3. **Test chạy song song trên một Postgres.** Nhiều bài khẳng định bất biến *toàn cục*
   `stock === Σ(movements.delta)`; file này đọc đúng lúc file kia đang trừ tồn. Đặt
   `fileParallelism: false`. Và dọn dữ liệu test **không được xoá `InventoryMovement`** —
   xoá dòng sổ là làm lệch đúng cái bất biến đang canh.

## M6 — Khuyến mãi + báo cáo + hỗ trợ
Mã giảm giá (điều kiện, hạn dùng, giới hạn lượt, chỉ-thành-viên), báo cáo doanh thu theo ngày/tuần/tháng, top sản phẩm, ticket hỗ trợ.

**Đã xong.** Ba màn dựng đúng route `promos`, `reports`, `support` của mockup —
cột, phụ đề và nhãn nút lấy từ bản trích đầy đủ (`npm run mockup`), không đoán.

- Mã giảm giá: `usedCount` **không phải ô nhập**, nó là số lần mã thực sự được
  tiêu trong transaction đặt đơn. Mã đã dùng thì không xoá, chỉ tắt. Đã phát ra
  ngoài rồi thì không đổi được ký tự mã.
- Báo cáo: đơn huỷ và đơn trả hàng **không** tính vào doanh thu; mốc thời gian là
  lúc đặt đơn. Cột Kênh mới có Website — sàn TMĐT ở M8 mới có kênh thứ hai.
- Hỗ trợ: trả lời là **thêm** tin, không sửa tin cũ. Yêu cầu đã đóng thì phải mở
  lại mới nói tiếp được.

**Tự thiết kế vì mockup không có:** form liên hệ ở storefront. Liệt kê 12 cờ màn
`is*` trong mockup không có màn nào là liên hệ, trong khi footer có ba link trỏ
`/ho-tro` (link chết từ M1) và màn Hỗ trợ bên admin lại ghi “yêu cầu từ **form
liên hệ**”. Form dựng theo đúng ngôn ngữ thiết kế đang dùng, gửi xong trả về mã
`TIC-…` cho khách cầm theo.

**Hai lỗi lộ ra khi chạy thật:**

1. **Client component import từ `src/server/*`.** Khối trao đổi trong admin lấy
   nhãn trạng thái từ `@/server/tickets` — file có `server-only` nên vỡ bundle.
   Nhãn chuyển sang `src/lib/tickets.ts` để cả hai phía dùng chung.
2. **Phiên còn sống mà tài khoản đã bị xoá** làm khoá ngoại nổ và **mất trắng yêu
   cầu của khách**. `createTicket` giờ tra lại người dùng trước khi gắn; không có
   thì lập dưới dạng khách vãng lai, nội dung vẫn tới nơi.

## M6.11 — Trang chủ đủ bảy khối, cũng là trang giới thiệu

**Bắt đầu bằng một kết luận suýt sai.** Câu hỏi là "chưa build phần giới thiệu
như trong mockup đúng không". Trích lại mockup rồi tra — có đối chứng, theo luật
đặt ra sau lần sai ở M3.5 — thì ra:

- mockup **không có** màn giới thiệu nào cả. Danh sách màn là `isHome`, `isList`,
  `isDetail`, `isCart`, `isCheckout`, `isTrack`, `isResult`, `isAccount`,
  `isReg`, `isAdmin`. Không có `isAbout`. Đối chứng: tra `isAccount`, `isCart`,
  `isCheckout`, `isHome` đều ra — tức cách tra này tìm được màn storefront;
- `shopNav` ghi thẳng `['Giới thiệu','home']`, footer ghi
  `['Giới thiệu cửa hàng','home']`. **Giới thiệu chính là trang chủ**;
- nhưng trang chủ mockup có **bảy khối**, ta mới dựng ba. Thiếu bốn khối cuối.

Nên việc phải làm không phải là dựng một trang mới, mà là **dựng nốt trang chủ**
và trỏ ba link "Giới thiệu" về đúng chỗ. Ba link đó đang trỏ vào `/gioi-thieu`,
một route chưa bao giờ tồn tại — bấm vào ra 404, và không ai phát hiện ra vì
không có gì kiểm link chết.

**Bốn khối dựng thêm.** Trong mockup cả bốn đều là chữ viết cứng; ở đây chúng đọc
dữ liệu thật, và **khối nào không có dữ liệu thì biến mất** thay vì bày ô trống.

1. **Băng-rôn sale** — đọc mã giảm giá đang chạy, lấy mã sắp hết hạn nhất. Bỏ mã
   hết lượt (mã hết lượt vẫn còn `active` trong DB), hết hạn, chưa tới ngày, và
   mã `memberOnly` — băng-rôn này khách vãng lai cũng thấy, mời họ gõ một mã sẽ
   bị từ chối ở bước cuối là tệ hơn không mời gì.
2. **Bán chạy nhất 30 ngày** — đếm theo `TINH_DA_BAN`, hằng số chuyển từ module
   báo cáo ra `src/lib/order-status.ts` để hai chỗ dùng **chung một danh sách**.
   Đếm cả đơn huỷ thì trang chủ ghi bán 120 còn báo cáo ghi 96, và chủ cửa hàng
   sẽ hỏi vì sao — không ai trả lời được. Sản phẩm đã ẩn thì không lên, dù bán
   chạy: đưa lên là mời khách bấm vào ngõ cụt.
3. **Lời khách** — chỉ đánh giá **đã duyệt**, từ 4 sao, dài từ 30 ký tự. Lọt lên
   trang chủ trước khi duyệt là vô hiệu hoá cả khâu duyệt đã dựng ở M2.
4. **Nhận tin sale** — bảng `NewsletterSubscriber` thật. Đăng ký trùng email
   không phải lỗi (upsert): người ta gõ, bấm, thấy im ru thì bấm lại. Huỷ nhận
   tin là **đánh dấu**, không xoá dòng — xoá xong họ đăng ký lại rồi lại nhận
   thư, mà không còn dấu vết là họ từng bảo đừng gửi nữa.

**Cố ý lệch mockup:** link "Tuyển dụng" ở footer, mockup thả về trang chủ, ở đây
trỏ sang `/ho-tro` như ba link chính sách đã sửa ở M6. Trang chủ không trả lời
được câu hỏi mà người ta bấm vào để hỏi.

**Hai chỗ sửa được nhờ chạy thật, không nhờ đọc mã:**

- dòng nhãn trên băng-rôn đỏ dùng `label-tech`, mà tiện ích đó mặc định màu xám
  nhạt — trên nền đỏ nó thành một vệt bùn không đọc được. Chỉ nhìn ảnh chụp mới
  thấy;
- bài kiểm "email sai bị chặn" lúc đầu đỏ, và nó **đúng là đang kiểm sai chỗ**:
  `type="email"` khiến trình duyệt chặn ngay tại ô nhập nên action không hề
  chạy. Bài kiểm giờ tắt `novalidate` để đi qua mặt trình duyệt, vì chốt thật
  phải nằm ở server — ai gửi thẳng POST vào action thì không có `type=email` nào
  ngăn được.

**Sửa nốt một lỗi từ M1, phát hiện khi đối chiếu lại mockup:** mọi lưới sản
phẩm đang dùng kẻ chỉ 1px (`gap-px bg-divider`, ô nền `bg-surface`), trong khi
mockup dùng `grid-template-columns:repeat(4,1fr);gap:24px` ở **cả bốn** lưới
(hàng mới · danh sách · bán chạy · sản phẩm liên quan), thẻ **không có nền
riêng**, và phần chữ thụt lề `14px 0 0` nên nằm thẳng hàng với mép ảnh.

Cái sai không phải lỗi gõ nhầm mà là một quyết định sai được **ghi vào tài liệu
rồi tự dẫn lại chính nó**: `docs/RESPONSIVE.md` viết "dùng `gap-px bg-divider`…
giữ đúng lưới Modernist ở mọi bề rộng", và chú thích trong `product-card.tsx`
dẫn ngược lại tài liệu đó. Đọc mã thấy khớp tài liệu nên không ai nghi. Đã sửa
cả mã lẫn hai chỗ ghi. Kẻ chỉ vẫn dùng — cho **ô số liệu trong admin**, không
cho thẻ sản phẩm.

**Lại một lần kết luận phủ định suýt sai.** Phép đo tự động báo lưới "Có thể bạn
cũng thích" ở trang chi tiết không đạt 24px. Kiểm lại thì lưới ấy **vốn đã**
đúng 24px từ đầu; sai là ở phép đo — nó nhận thẻ sản phẩm theo `<article>`, còn
khối đó dựng bằng `<a>`. Bài kiểm giờ nhận thẻ theo "ô có ảnh **và** có đường
dẫn tới trang sản phẩm", và có thêm một dòng đối chứng "thấy lưới sản phẩm" đặt
ngay trước mỗi dòng đo — không thấy gì thì đó là tin về phép đo, không phải tin
về giao diện.

**Xong khi:** trang chủ hiện đủ bảy khối · không còn link nào trỏ `/gioi-thieu` ·
bấm "Giới thiệu" ra trang chủ · mọi link ở trang chủ đều mở được · ô nhận tin lưu
được thật và chặn được email sai ở cả hai lớp.

`tests/home.test.ts` (19 bài) và hai lượt chạy tay qua trình duyệt: 19 kiểm tra
cho trang chủ (gồm quét 26 link tìm 404) và 16 kiểm tra cho khoảng cách lưới ở
cả bốn chỗ tại 1440/390px, kèm ảnh chụp cả trang ở hai bề ngang.

## M6.19 — Thanh bên quản trị: icon thật và hết tràn

Người dùng báo "bấm icon trên thanh bên không ăn". Bấm thử thì **ăn** — nhưng
đo ra hai chuyện khác.

**Hàng đầu thanh bên tràn khỏi bề rộng thu gọn.** 64px mà nội dung cần 86px (ô
vuông 18 + khoảng cách 10 + nút 26 + padding 2×16). `aside` đặt `overflow-y-auto`,
mà theo CSS một trục khác `visible` thì trục kia tự thành `auto` — phần thừa bị
cắt. Đo được: nút lòi 6px ra ngoài, logo và nút mở lại đều mất một góc, đáy thanh
bên mọc thêm thanh cuộn ngang. Thu gọn thì xếp dọc là hết.

**Thu gọn xong không đọc được gì.** Mockup để mỗi mục một chấm vuông cùng màu,
nên 13 mục thành 13 chấm y hệt nhau. Đổi sang icon riêng cho từng mục — lệch
mockup, và lệch có chủ ý.

Đáng ghi lại về cách đo: bộ kiểm cũ dùng `el.click()` nên **báo xanh suốt** dù
nút bị cắt. `.click()` bắn thẳng sự kiện vào phần tử, bỏ qua khâu dò xem điểm đó
chạm vào cái gì. Phải `Input.dispatchMouseEvent` theo toạ độ thật cộng
`elementFromPoint` mới thấy. Bộ `sidebar.js` giờ đo hình học (`loRaNgoai`,
`cuonNgang`) thay vì chỉ hỏi "bấm có chạy không".

Đã kiểm: `sidebar.js` 9 · `chuong.js` 14 · `chuong2.js` 29 (bấm chuột thật trên
8 trang, 5 bề ngang) · `drawer.js` 7 — kèm bắt lỗi hydrate ở cả `next dev` lẫn
bản build production.

## M6.18 — Bảng size quản lý được

### Vì sao phải làm

Bảng size trước đây **viết cứng trong mã**: ba bảng (áo · quần dài · quần short)
nằm trong `src/lib/size-chart.ts`, ánh xạ sang danh mục bằng một object
`BY_CATEGORY`. Cửa hàng nhập một dòng áo khoác dày có số đo khác là phải sửa mã
rồi build lại. Nó cũng khoá cứng giả định "mỗi danh mục một bảng", trong khi
thực tế cùng một danh mục có thể có hàng form ôm và hàng form rộng.

### Dữ liệu

Hai bảng mới, và **hai chỗ trỏ tới** chúng:

```
SizeChart(id, name, slug, fit, howTo[], columns[])
SizeChartRow(id, chartId, size, values[], sort)

Category.sizeChartId  → SizeChart   (onDelete: SetNull)
Product.sizeChartId   → SizeChart   (onDelete: SetNull)
```

`columns` và `values` để mảng chuỗi chứ không phải cột cố định: mỗi ngành hàng
đo một kiểu, quần cần "dài quần / vòng đùi", áo cần "rộng vai / dài tay". Cột
`Size` không nằm trong `columns` — nó luôn có, `bangSizeCho` tự chèn vào đầu.

**Sản phẩm đè lên danh mục.** Bỏ trống ở sản phẩm nghĩa là "theo danh mục", nên
mặc định vẫn là cách cũ và chỉ những sản phẩm lạ mới phải khai riêng.

### Chuyển dữ liệu cũ

Đây là phần đáng lo nhất: làm hụt một chỗ là **mọi trang sản phẩm lặng lẽ mất
bảng size mà không có lỗi nào**. Nên có hẳn một migration nạp dữ liệu riêng
(`20260809070000_nap_bang_size`) chép nguyên ba bảng viết cứng vào DB với id cố
định `sc_ao` · `sc_quan_dai` · `sc_quan_short`, rồi dựng lại đúng ánh xạ
`BY_CATEGORY` cũ. `tests/bang-size.test.ts` canh lại từng con số một
(`M = 100 / 45 / 70 / 20`), không chỉ đếm số dòng.

### Chặn xoá bảng đang dùng

Quan hệ khai `SetNull`, nên xoá một bảng đang có 5 danh mục dùng thì DB **không
báo gì cả** — nó chỉ xoá và set null, và 5 danh mục mất bảng size trong im lặng.
`deleteSizeChart` đếm trước rồi ném `ChartInUseError` kèm tên danh mục cụ thể.

### Màn quản trị

`/admin/bang-size` (quyền `bang-size.quan-ly`): danh sách bảng · số dòng · số
danh mục đang dùng, kèm cảnh báo danh mục nào **chưa có** bảng nào. Màn sửa cho
đổi tên/cột/ghi chú, thêm–sửa–xoá từng dòng, và gán bảng cho danh mục ngay tại
chỗ. Dòng nào số giá trị lệch với số cột thì đánh dấu "lệch cột" — báo chứ không
chặn, vì nhập dở dang là chuyện bình thường.

Xoá xong thì `redirect` về danh sách. Ở lại là đứng trên trang của một bảng
không còn tồn tại: màn hình vẫn hiện đủ dữ liệu như thường, bấm gì cũng lỗi.

### Đã kiểm

`tests/bang-size.test.ts` (17 bài) và `bang-size.js` chạy trình duyệt thật
(33 kiểm tra): dữ liệu cũ còn nguyên → tạo bảng mới → thêm/sửa/xoá dòng → gán
danh mục → **trang sản phẩm đổi sang bảng mới** → chặn xoá khi đang dùng → gỡ
rồi xoá được → trang sản phẩm trở lại bảng gốc → ô chọn bảng riêng ở màn sửa sản
phẩm → không tràn ngang ở 1440 và 390px.

## M6.17 — Chín khuyến nghị sau lượt chấm điểm

### Tồn kho theo từng kho (khuyến nghị lớn nhất)

Ba kho trong dữ liệu nhưng tồn chỉ là **một con số chung** — không trả lời được
"kho Hà Nội còn mấy cái", và `MovementType.TRANSFER` chưa bao giờ dùng.

Thêm `StockLevel(variantId, warehouseId, qty)`, **giữ nguyên `Variant.stock`
làm tổng của mọi kho**. Quyết định này là chỗ đáng cân nhất: mọi nơi đang đọc
`stock` (giỏ hàng, đặt đơn, trang sản phẩm, bất biến
`stock === Σ(movements.delta)`) không phải sửa một dòng nào, và cửa hàng một kho
vẫn chạy y như cũ. `moveStock` nhận thêm `warehouseId` **không bắt buộc** — bỏ
trống thì vào kho chính, nên mọi lối gọi cũ giữ nguyên.

Migration **tự chuyển tồn hiện có** vào kho chính. Không có bước đó thì tổng
theo kho bằng 0 trong khi `Variant.stock` khác 0: màn tồn kho hiện đúng, màn
theo kho hiện rỗng, và không có gì báo lệch.

`chuyenKho()` sinh **hai dòng sổ** `TRANSFER` — âm ở kho đi, dương ở kho đến —
nên tổng không đổi và bất biến cũ vẫn đúng. Một dòng duy nhất thì sổ của từng
kho không đọc được hàng đi đâu về đâu.

Thêm bất biến thứ hai `auditWarehouse()`: `Variant.stock` phải bằng tổng mọi kho.
Tách khỏi `auditStock()` vì hỏng theo hai kiểu khác nhau — sổ lệch là ai đó ghi
thẳng vào `stock`, tổng kho lệch là một lối gọi `moveStock` quên cập nhật
`StockLevel`.

### Tám khuyến nghị còn lại

1. **Thông báo mã giảm giá đảo màu.** Thành công tô đỏ nổi bật, lỗi tô
   `text-muted` — màu nhạt nhất trang. Gõ sai mã thì gần như không thấy gì. Nay
   lỗi có viền + nền và `role="alert"`, thành công lùi về chữ xám.
2. **Đích chạm ở quản trị mobile.** 21–41 liên kết cao 15–20px. Vá bằng **một
   quy tắc CSS** cho `.bang-quan-tri a` thay vì sửa tám trang — trang mới thêm
   sau cũng được hưởng mà không phải nhớ.
3. **Bí mật.** `AUTH_SECRET` sinh ngẫu nhiên thật; **thiếu là `auth.ts` ném lỗi
   ngay lúc khởi động** chứ không chạy tiếp với khoá mặc định. Mật khẩu seed đổi
   từ `admin123456` viết cứng sang `SEED_PASSWORD`, không đặt thì **sinh ngẫu
   nhiên và in ra đúng một lần**.
4. **Cache tầng dữ liệu catalog.** Không dùng ISR vì trang vẫn phải động —
   header đọc cookie giỏ hàng và phiên. Bọc `unstable_cache` theo nhãn quanh
   đúng chỗ tốn thời gian (truy vấn DB), và `revalidateTag` ở sáu chỗ admin ghi.
   Đo ở **production**: 30–60ms, so với 300–690ms ở dev.
5. **Rate limit dùng Redis khi có `REDIS_URL`**, không có thì đếm trong RAM và
   **nói rõ ở log**. Redis chết giữa chừng thì rơi về RAM chứ không chặn người
   dùng — giới hạn tần suất là lớp bảo vệ, không phải cửa chính.
6. *(tồn kho theo kho — ở trên)*
7. **Nhắn tiếp trong cùng yêu cầu hỗ trợ.** Yêu cầu đã `CLOSED` thì không cho
   nối thêm: mở lại một việc đã kết luận bằng một dòng nhắn là cách nhanh nhất
   để nó rơi khỏi tầm mắt. Khách nhắn thì việc **quay lại `OPEN`**.
8. **Thao tác hàng loạt trên bảng đơn.** Chạy tuần tự và **bỏ qua đơn không hợp
   lệ thay vì dừng cả mẻ** — chọn 20 đơn thì thường vài đơn đã được người khác
   xử lý; ném lỗi ở đơn thứ ba và bỏ dở 17 đơn còn lại là bắt họ dò xem cái nào
   đã chạy. Câu tổng kết ghi rõ **bao nhiêu xong, bao nhiêu bỏ qua và vì sao**.
9. **Báo cáo chọn khoảng ngày.** Sáu lựa chọn + tự chọn, ghi vào URL nên gửi
   link "quý này" cho người khác mở ra vẫn đúng quý đó.

### Bốn lần phép đo lại hỏng

- **`text-transform` lần thứ ba.** Nhãn thẻ dùng `label-tech` nên `innerText`
  trả "DOANH THU · 12 THÁNG…" viết hoa, regex phân biệt hoa thường đỏ nhầm hai
  lượt liền. Bài kiểm giờ đọc theo **cấu trúc DOM** (`<dt>` → `<dd>`) chứ không
  dò chữ.
- **Đo cache ở `next dev`** — thời gian bị chi phối bởi biên dịch lại, đo ở đó
  là đo nhầm thứ. Chuyển sang đo bản production bằng `curl`.
- **Bộ kiểm đọc `dev.log`** trong khi máy chủ production ghi vào `prod.log`, và
  lỗi báo ra ("không thấy ô input") chẳng liên quan gì tới nguyên nhân. Nay có
  `docLog()` đọc cả hai.
- **Rate limit thật chặn chính bộ kiểm**: chạy quá 5 lượt "quên mật khẩu" trong
  một giờ từ cùng IP. Không phải lỗi — đúng là tính năng đang làm việc của nó.

**Xong khi:** chuyển kho xong **tổng tồn không đổi** và sổ có hai dòng TRANSFER ·
mã sai hiện nổi bật · 0 đích chạm dưới 44px ở quản trị mobile · trang sản phẩm
production dưới 100ms · nhắn tiếp nằm trong cùng yêu cầu · chọn 2 đơn rồi xác
nhận hàng loạt ra câu tổng kết · đổi kỳ báo cáo thì số liệu đổi theo.

`tests/tra-hang-diem.test.ts` thêm 5 bài chuyển kho, `tests/inventory.test.ts`
thêm bất biến tổng-theo-kho, tổng **334 bài đơn vị**. Chạy tay: 39 kiểm tra cho
chín khuyến nghị, và **chạy lại toàn bộ 13 bộ cũ trên bản production**.

## M6.16 — Vá nốt sau lượt quét toàn bộ chức năng

Quét bằng ba lối: đối chiếu mockup (đối chứng đạt), **rà mọi hàm `export` trong
`src/server` xem có ai gọi không**, và kiểm chứng bằng SQL. Lối thứ hai là lối
đã bắt được ba lỗi ở M6.13 và lần này bắt tiếp bốn.

### Trả hàng không hoàn tồn kho — lỗi nặng nhất

`MovementType.RETURN` có trong schema nhưng `moveStock` **chưa bao giờ** được
gọi với nó. Ba lối kiểm chứng độc lập cùng chỉ một chỗ: `advanceOrderStatus` chỉ
rẽ nhánh riêng cho `CANCELLED`, `grep type:"RETURN"` trong toàn bộ `src/` ra 0
kết quả, và DB có 4 đơn `RETURNED` với **0 dòng sổ** kiểu RETURN.

Kiểu hỏng này im lặng tuyệt đối: bất biến `stock === Σ(movements.delta)` vẫn
đúng (vì không sinh dòng nào), đơn vẫn đổi trạng thái, báo cáo vẫn loại RETURNED
khỏi doanh thu. Chỉ có kho thật là lệch — cửa hàng cầm hàng trong tay mà hệ
thống bảo đã bán, nên không bán lại được.

`returnOrder()` làm bốn việc trong một transaction: hàng về kho qua `moveStock`,
thu hồi điểm đã cộng, **trả lại điểm khách đã tiêu**, và đánh dấu đã hoàn tiền.
**Không** trả lại lượt dùng mã giảm giá — khác đơn huỷ: khách đã mua thật rồi
mới trả, trả lượt là mở đường dùng một mã vô hạn bằng cách mua rồi trả.

Vá kèm: `cancelOrder` cũng chưa trả lại `pointsUsed`. Chưa lộ ra vì lúc đó chưa
tiêu điểm được, nhưng sẽ thành lỗi ngay khi mở tính năng dùng điểm.

### Điểm thưởng: mở đường tiêu

Mockup ghi thẳng trong `welcomePerks`: *"Tích 1 điểm cho mỗi 1.000 ₫ — **đổi
thẳng thành tiền ở lần mua sau**"*, và storefront nhắc lại lời hứa đó. Nhưng
`PointReason.REDEEM_ORDER` chưa ai dùng: chương trình tích điểm đang một chiều.

Ba chốt trong `src/lib/points.ts`, lấy cái nhỏ nhất: số điểm đang có · trần phần
trăm tiền hàng (mặc định 50%) · và chính tiền hàng. **Điểm không trừ vào phí
ship** — đó là tiền cửa hàng trả cho bên thứ ba. Trần phần trăm là chốt an toàn:
không có nó thì một tài khoản tích lâu năm lấy gần như cả đơn bằng điểm.

Server **tính lại** từ số dư thật, y như tiền giảm của mã; số client gửi chỉ là
ý muốn. Và xin quá thì **cắt về mức cho phép chứ không ném lỗi**: khách để giỏ
vài ngày rồi quay lại, điểm có thể đã đổi vì một đơn khác vừa giao — chặn cả đơn
vì chuyện đó là phạt nhầm người.

### Bốn thứ có tầng server mà không màn nào gọi tới

| Hàm chết | Đã nối vào |
|---|---|
| `updateVariant` | Sửa biến thể ngay trong bảng — trước đó chỉ thêm/xoá, mà xoá bị chặn khi đã có tồn, nên gõ sai chênh giá là không sửa lại được. **Không cho sửa tồn ở đây**: tồn chỉ đổi qua `moveStock`. |
| `listMovements` | Sổ kho từng biến thể, cột "còn lại" cộng dồn từ dưới lên. Có cảnh báo khi sổ và tồn lệch nhau thay vì giấu. |
| `getTicketByCode` | `/ho-tro/tra-cuu` — khách nhận mã `TIC-…` rồi trước đó không có trang nào xem lại. Chặn 20 lượt/IP/giờ vì mã chạy tuần tự, không chặn là ai cũng dò được trao đổi của người khác bằng cách đếm lên. |
| `ReceiptLine.unitCost` | Lãi gộp trong báo cáo. Giá vốn là **bình quân gia quyền mọi phiếu đã ghi sổ** — không lấy giá nhập gần nhất vì một lô nhỏ mua đắt kéo lệch cả tháng. Hàng bán ra chưa từng nhập thì **không đoán giá vốn**, đếm riêng và báo lên màn hình. |

### Nút chuông: từ nói dối thành có ích

Nút "Thông báo" ở khu quản trị **không có `onClick`** mà vẫn đeo chấm đỏ báo có
thông báo mới. Nút không làm gì đã tệ; đeo chấm đỏ là nói dối.

Nay là "việc cần làm", đếm thẳng từ dữ liệu thật (đơn chờ xác nhận · yêu cầu hỗ
trợ chưa xong · biến thể hết/sắp hết · phiếu nhập còn nháp) nên không bao giờ
lệch với màn tương ứng và không cần ai đánh dấu đã đọc. Mục nào bằng 0 thì
không bày, và không có việc gì thì **không có chấm đỏ**. Lọc theo quyền như sidebar.

### Bốn lần phép đo lại hỏng

- `innerText` **tôn trọng `text-transform`**: `Badge` viết hoa bằng CSS nên chuỗi
  trả về là "KHÁCH TRẢ", regex phân biệt hoa thường thì đỏ trong khi sổ hoàn toàn
  đúng — DB đã xác nhận có dòng RETURN.
- Chọn dòng đầu bảng tồn kho → trúng biến thể chưa nhập hàng bao giờ, sổ hiện
  trạng thái rỗng.
- Chọn sản phẩm đầu danh sách → trúng hàng rác do chính test E2E các lượt trước
  tạo ra, không có biến thể nào. (Đã dọn 6 sản phẩm rác đó khỏi DB.)
- `updateSettings` trải `...input` thẳng vào Prisma nên ô tick bỏ chọn thành
  `undefined` và **Prisma bỏ qua** — đã ép `Boolean()` cho cả `redeemEnabled`.

**Xong khi:** ghi nhận trả hàng thì **tồn kho đọc lại từ màn tồn kho phải tăng**
và sổ có dòng "Khách trả" · khách kéo thanh điểm thì tổng tiền giảm và số gửi
lên server nằm trong ô ẩn · sửa được biến thể · mở được sổ kho · tra được yêu
cầu hỗ trợ bằng mã · nút chuông hiện việc thật · báo cáo có lãi gộp.

`tests/tra-hang-diem.test.ts` (16 bài) và hai lượt chạy tay: 37 kiểm tra cho các
bổ sung, 12 kiểm tra riêng cho luồng trả hàng đầu-cuối. Rà lại lần cuối: **không
còn hàm `export` nào trong `src/server` mà không ai gọi**.

## M6.15 — Menu tài khoản cho quản trị · bật/tắt hạng · sắp xếp từng cột

### Menu tài khoản trong khu quản trị

Cụm tài khoản góc phải khu quản trị vốn là một khối chữ trơ — nhân viên muốn
đăng xuất phải sang `/tai-khoan` ngoài cửa hàng rồi tìm nút ở đó, việc cuối ca
ai cũng làm. Nay bấm vào xổ xuống: tên · vai trò · email · lối về cửa hàng ·
hồ sơ & mật khẩu · đăng xuất.

Cùng cách dựng với menu ngoài cửa hàng (không `useOverlay`, `<button>` có
`aria-haspopup`, đóng khi đổi trang) nhưng **nội dung khác**: người trong khu
quản trị cần vai trò và lối quay về cửa hàng, không cần điểm thưởng.

### Bật/tắt chương trình hạng thành viên

Thêm `StoreSetting.tiersEnabled`. Tắt thì hạng biến mất khỏi **bốn chỗ**: trang
tài khoản, menu tài khoản, bảng khách hàng (mất luôn cả cột) và hồ sơ khách ở
quản trị. Cửa hàng không chạy chương trình hạng thì không phải nhìn một cột luôn
ghi "MỚI" ở mọi màn.

**Tắt là ngừng hiển thị, không phải ngừng ghi nhận.** Chi tiêu vẫn tính như
thường nên bật lại lúc nào cũng có sẵn số, không mất lịch sử — có test khoá điều
này. Và khi tắt thì **bỏ luôn phép kiểm ba ngưỡng phải tăng dần**: chúng không
còn ý nghĩa gì, bắt kiểm lúc đó chỉ chặn người ta lưu cài đặt vì một lỗi không
tồn tại.

**Một lỗi thật lộ ra ngay khi viết:** `updateSettings` trải `...input` thẳng vào
Prisma. Bỏ tick thì trường vắng mặt trong FormData → Zod cho `undefined` →
**Prisma bỏ qua field `undefined`** → cờ giữ nguyên giá trị cũ, người dùng tắt
mãi không được và không có lỗi nào hiện ra. `payCod`/`payBank` đã ép `Boolean()`
đúng vì lý do này; `tiersEnabled` giờ cũng vậy. Bài kiểm cũ trong
`tests/settings.test.ts` là thứ bắt được thay đổi hành vi này.

### Sắp xếp theo từng cột

Trước đó tám bảng quản trị chỉ có 2–3 cột sắp được, ba bảng không có cột nào.
Nay mọi cột **đáng sắp** đều sắp được, chia làm ba loại:

1. **Cột thật trong bảng** — để Postgres sắp, như cũ.
2. **Cột qua quan hệ** — `{ product: { name } }` cho Tồn kho, `{ category: { name } }`
   và `{ variants: { _count } }` cho Sản phẩm. Mỗi cột giữ một mệnh đề `orderBy`
   trọn vẹn chứ không chỉ tên trường, vì "MÀU · SIZE" phải sắp theo màu rồi tới size.
3. **Cột tính ra** — chi tiêu / số đơn / hạng của khách, và tồn của sản phẩm
   (tổng tồn mọi biến thể). Những cột này **lấy hết rồi tính rồi sắp rồi mới cắt
   trang**. Cách rẻ hơn — cắt trang trước rồi sắp trong 20 dòng đang hiện — cho
   ra bảng trông đúng nhưng **không đưa khách chi nhiều nhất lên đầu**, mà nhìn
   thì không phân biệt được. `tests/admin-sort.test.ts` khoá đúng điểm đó: so
   dòng cuối trang 1 với dòng đầu trang 2.

Hai cột sắp theo **thứ bậc chứ không theo bảng chữ cái**: trạng thái đơn đi theo
vòng đời (chờ → xác nhận → đóng gói → giao → xong), và hạng khách đi theo
MỚI → BẠC → VÀNG → KIM CƯƠNG. Theo chữ cái thì "Đã giao" nằm cạnh "Đã huỷ", và
"BẠC" đứng trước "KIM CƯƠNG" đứng trước "MỚI" — bảng mất hết ý nghĩa.

### Ba lần phép đo lại hỏng

- `giamDan([])` là `true` vì `[].every()` là `true` — mọi bài kiểm sắp xếp sẽ
  **xanh trên bảng rỗng**, chứng minh đúng bằng không. Hàm giờ trả `false` khi rỗng.
- So thứ tự của Postgres với `localeCompare("vi")` của JS: hai bảng đối chiếu
  khác nhau, bài kiểm đỏ vì collation chứ không vì mã sai. Đổi sang phép so
  không phụ thuộc collation.
- So "trang 1 chiều xuôi đảo ngược" với "trang 1 chiều ngược": chỉ đúng khi cả
  tập nằm gọn một trang.

**Xong khi:** bấm ô tài khoản trong quản trị thấy vai trò và đăng xuất được ·
tắt hạng thì cột HẠNG biến mất ở cả quản trị lẫn cửa hàng rồi bật lại trở về ·
mọi bảng quản trị sắp được theo từng cột và bấm lần hai thì đảo chiều.
`tests/admin-sort.test.ts` (20 bài) và 35 kiểm tra qua trình duyệt.

## M6.14 — Menu tài khoản xổ xuống ngay trên header

Ô tài khoản ở header vốn là một liên kết thẳng sang `/tai-khoan`. Muốn xem còn
bao nhiêu điểm, hay chỉ để đăng xuất, cũng phải **rời trang đang xem** rồi bấm
quay lại — trong khi đó là hai thao tác lặp nhiều nhất của người đã đăng nhập.

Nay bấm vào là xổ xuống: tên · hạng · số điểm · còn thiếu bao nhiêu để lên hạng
kế tiếp · bốn lối tắt sang từng tab tài khoản · lối vào khu quản trị nếu là nhân
viên · và **nút đăng xuất ngay tại đó**.

Ba chi tiết đáng ghi:

1. **Không dùng `useOverlay`.** Hook đó khoá cuộn trang và bẫy Tab, đúng cho
   drawer toàn màn hình nhưng sai ở đây: menu nằm trong header dính, khoá cuộn
   là trang đứng im khi menu mở. Chỉ cần đóng khi bấm ra ngoài hoặc bấm Esc.
2. **Là `<button>` chứ không phải `<a>`**, có `aria-haspopup="menu"` và
   `aria-expanded`. Thứ xổ xuống một panel không phải là liên kết, và trình đọc
   màn hình cần biết trạng thái đóng/mở.
3. **Đóng khi đổi trang** (`useEffect` theo `pathname`) — không thì menu treo
   lại trên trang vừa điều hướng tới.

**Vá kèm một lỗi lộ ra khi làm:** đáy drawer mobile **luôn** hiện "Đăng nhập /
Đăng ký", kể cả khi đang đăng nhập. Trên điện thoại không có đường nào đăng xuất
ngoài việc vào hẳn trang tài khoản. Nay đã đăng nhập thì đáy drawer là khối
thông tin tài khoản + nút đăng xuất.

Header lấy thêm hạng qua `hangCuaToi()` — cùng hàm với trang tài khoản, nên hai
chỗ không thể hiện hai hạng khác nhau.

**Xong khi:** bấm ô tài khoản thấy điểm và hạng mà **không rời trang đang xem** ·
đăng xuất được ngay trên menu · Esc và bấm ra ngoài đều đóng · mobile có đăng
xuất trong drawer. 27 kiểm tra qua trình duyệt, và chạy lại toàn bộ các bộ cũ
(header nằm trên mọi trang nên phải kiểm hồi quy).

## M6.13 — Vá và bù sau lượt đóng vai người dùng thật

Chạy trọn bốn kịch bản qua trình duyệt ở mọi vai (khách vãng lai · thành viên ·
STAFF · WAREHOUSE · ACCOUNTANT · ADMIN), ~135 phép kiểm. Khu quản trị gần như
sạch (67/68, phân quyền chặn cả khi gõ thẳng URL); chỗ hổng nằm hết ở phía khách.

### Lỗi nặng nhất: mất sạch giỏ hàng khi đăng nhập

`mergeGuestCart` chuyển hàng sang một `Cart` mới **mang token ngẫu nhiên khác**
rồi xoá giỏ khách, trong khi cookie `cartToken` vẫn trỏ vào token vừa bị xoá. Mà
`readCart()` / `getOrCreateCart()` **chỉ tra theo token, không bao giờ tra theo
`userId`**. Hàng thành mồ côi: có trong DB, không màn nào lấy ra được.

Kiểu hỏng này nguy hiểm vì **không có gì đỏ**. Không exception, không log, đơn
không sai — chỉ là khách chất đầy giỏ, bấm đăng nhập ở bước thanh toán, rồi thấy
giỏ trống và bỏ đi. Xác nhận bằng SQL: giỏ đã gộp nằm nguyên trong DB, đúng chủ,
đúng một dòng hàng, trong khi trình duyệt hiện "Giỏ hàng đang trống".

Vá ở hai đầu: `timGio()` tra **giỏ của người đăng nhập trước, cookie sau**; và
`mergeGuestCart` **nhận luôn giỏ khách làm giỏ của mình** (chỉ gắn `userId`, giữ
nguyên token) khi member chưa có giỏ, thay vì tạo dòng mới rồi xoá dòng cũ.

### Ba thứ có đủ tầng server nhưng không màn nào gọi tới

Cùng một kiểu: viết xong rồi quên nối dây, và không có gì phát hiện ra.

- **Đánh giá** — bảng `Review`, màn duyệt ở admin, khối hiển thị trên trang sản
  phẩm đều có; `createReview` **không tồn tại**. Mọi đánh giá đang thấy là dữ
  liệu mẫu. Nay có `src/server/reviews.ts` + form: chỉ ai có đơn `DELIVERED`
  chứa đúng sản phẩm mới gửi được, một đơn một đánh giá, và vào hàng chờ duyệt.
- **Sổ địa chỉ** — `saveAddress` / `deleteAddress` / `setDefaultAddress` viết
  đủ, chỉ `listAddresses` được gọi (ở bước thanh toán). Khách mới không bao giờ
  lưu được địa chỉ, nên ô "chọn địa chỉ đã lưu" vĩnh viễn rỗng.
- **Huỷ đơn** — `cancelOrder` chỉ gọi từ admin. Khách đổi ý phải gọi hotline.
  Nay có nút ở lịch sử đơn; action **kiểm đơn có đúng của người đang đăng nhập
  không** trước khi gọi, vì `cancelOrder` chỉ nhận mã đơn.

### Trang tài khoản: dựng lại đúng bốn tab của mockup

`accountTabs` của mockup là `['Lịch sử đơn hàng','Hồ sơ','Sổ địa chỉ','Sản phẩm
yêu thích']`; ta chỉ có lịch sử đơn + sổ điểm. Nay đủ bốn, chọn tab bằng query
string chứ không phải trạng thái client — gửi link vẫn mở đúng tab, Back vẫn lùi
đúng chỗ. Thêm `Wishlist` (model mới), sửa hồ sơ, và **đổi mật khẩu khi đang
đăng nhập** (bắt nhập mật khẩu hiện tại, đổi xong đẩy `sessionsValidFrom` nên mọi
thiết bị khác bị đăng xuất).

### Còn lại

- Kết quả tra cứu đơn **không in mã đơn** ở đâu cả — khách không chắc đang xem
  đúng đơn nào, cũng không có gì chép lại khi gọi hỗ trợ.
- Thành viên đã đăng nhập vẫn phải gõ lại tên/SĐT ở bước thanh toán.
- Không có nút in phiếu giao — nhân viên đóng gói chép tay địa chỉ, chép sai một
  số nhà là hàng đi lạc và cửa hàng chịu phí hai lượt.
- Không có thư báo khi đơn rời kho / giao xong / bị huỷ. Chỉ báo ba nấc đó; báo
  cả "đã xác nhận" và "đang đóng gói" là dội bốn thư cho một lần mua.
- Không có `robots.txt`, `sitemap.xml`, JSON-LD — site bán hàng mà không có gì
  cho máy tìm kiếm.
- Ba link chính sách trỏ về `/ho-tro`. Nay là ba trang thật, **lấy số liệu từ
  cài đặt cửa hàng** để chính sách không nói một đằng hệ thống tính một nẻo.
- Màn sửa sản phẩm không in mã sản phẩm, trong khi SKU mọi biến thể dựng từ nó.

Gom thêm ba hằng số đang bị chép ở nhiều nơi về `lib`: danh sách tỉnh, tên hãng
vận chuyển, danh sách trạng thái tính chi tiêu. Cùng một lý do mỗi lần — hai chỗ
giữ hai bản là hai màn nói hai con số khác nhau.

### Năm lần phép đo tự nó hỏng

Đáng ghi vì cả năm đều **xanh hoặc đỏ sai**, không phải mã hỏng:

1. regex `\d` viết trong template literal bị JS nuốt dấu gạch chéo → đi tìm chữ
   "d"; mọi phép đo giá trả về 0 mà bài kiểm vẫn **xanh** vì `0 <= bất cứ gì`;
2. `querySelector('form')` bắt trúng ô tìm kiếm ở header → trang nhảy sang
   `/san-pham`, bài kiểm đo một trang khác mà tưởng đang đo trang tra cứu;
3. `querySelector('[name=description]')` bắt trúng **`<meta name="description">`
   ở `<head>`** → gán `.value` ném "Illegal invocation", ô mô tả để trống, rồi
   báo "không tạo được sản phẩm" trong khi màn tạo hoàn toàn bình thường;
4. đo thanh kéo giá của sidebar desktop đang bị ẩn ở 390px → cao 0px;
5. `grep | head -6` cắt mất dòng gọi thật, suýt báo "điểm thưởng không bao giờ
   được cộng".

Nên mọi bài kiểm giờ có **dòng đối chứng đi kèm**: "đọc được giá từ thẻ", "đọc
được tổng số sản phẩm", "vẫn ở trang tra cứu sau khi gửi", "chưa mở sheet thì
chưa có thanh nào hiện". Một số 0 không lặng lẽ đi qua được nữa.

**Xong khi:** `tests/tai-khoan.test.ts` (18 bài) xanh, toàn bộ 291 bài xanh, và
chạy lại **toàn bộ** kịch bản qua trình duyệt: khách vãng lai 30/30 · thành viên
34/34 · bốn vai quản trị 68/68 · luồng nghiệp vụ 22/22 · SEO và phiếu giao 19/19
· lưới sản phẩm 16/16 · thanh kéo giá 20/20 · trang chủ 19/19 · thu hồi phiên
13/13 · mật khẩu 22/22.

## M6.12 — Lọc giá: một thanh kéo, cận trên là giá món đắt nhất

Bộ lọc giá đang là **hai ô nhập số** "KHOẢNG GIÁ — từ … đến …". Mockup không có
thứ đó: nó có đúng **một** `<input type="range">`, nhãn `GIÁ TỐI ĐA — {giá}`,
`min="199000" max="1590000" step="10000"`, và lọc `p.price <= priceMax`. Chuỗi
`KHOẢNG GIÁ` không xuất hiện lần nào trong mockup.

Cận trên `1590000` trong mockup chính là **giá của sản phẩm đắt nhất** trong bộ
dữ liệu của nó — nên ở đây nó lấy từ `facets.priceCeil` (đã có sẵn từ M2, trước
chỉ dùng làm gợi ý placeholder), tròn lên bội số 10.000 cho khớp `step`.

Ba quyết định trong `PriceSlider`:

1. **Kéo thì không tải lại, thả tay mới tải.** `onChange` của `type=range` bắn
   theo từng pixel; áp thẳng vào URL là một lần kéo gọi server vài chục lần. Số
   trên nhãn vẫn chạy theo tay nhờ trạng thái cục bộ, còn URL chỉ đổi ở
   `pointerup` / `keyup` / `blur`.
2. **Kéo hết sang phải là bỏ lọc**, xoá hẳn tham số khỏi URL — không giữ lại
   `gia-den=<giá cao nhất>`, vì như thế bộ đếm sẽ báo "đang bật 1 bộ lọc" cho
   một điều kiện không loại được gì.
3. **Chỉ còn một mức giá thì ẩn cả khối.** Thanh kéo không kéo được đi đâu.

`gia-tu` vẫn nhận qua URL (link cũ không chết, và `parseCatalogQuery` vẫn đảo lại
khi nhập ngược) nhưng không còn ô nhập nào ngoài giao diện. Dòng tóm tắt đổi
theo mockup: `N sản phẩm · giá tối đa X`, hiện **cả khi chưa lọc gì** — nó cho
biết thanh đang ở đâu và kéo được tới đâu.

**Ba lần kết luận sai liên tiếp trong lúc viết bài kiểm, cả ba đều là phép đo
hỏng chứ không phải mã hỏng:**

- regex `/([\d.]+)\s*₫/` viết trong **template literal** bị JS nuốt dấu gạch
  chéo thành `/([d.]+)s*₫/` — nó đi tìm chữ "d". Mọi phép đo giá trả về 0, và
  hai dòng kiểm liên quan vẫn **xanh** vì `0 <= bất cứ gì`;
- trang có **hai** thanh kéo (sidebar desktop + sheet mobile); `querySelector`
  lấy đúng cái đang ẩn nên đo ra cao 0px;
- so cận trên và số lượng với **12 sản phẩm đang hiện** trong khi danh sách bị
  cắt trang, nên "870.000 > 840.000" trông như lỗi cận trên.

Bài kiểm giờ có **dòng đối chứng đi kèm mỗi phép đo** — "đọc được giá từ thẻ",
"đọc được tổng số sản phẩm", "chưa mở sheet thì chưa có thanh nào hiện". Một số
0 không còn lặng lẽ đi qua được nữa. Đây đúng là luật đã ghi sau lần sai ở M3.5,
lần này áp cho phép đo chứ không chỉ cho việc tra cứu.

**Xong khi:** nhãn ghi `GIÁ TỐI ĐA — <số>` · kéo thì lọc và không còn hàng nào
đắt hơn mức đã kéo · kéo hết sang phải thì tham số biến mất và danh sách trở lại
đủ · thanh nằm trong sheet lọc trên mobile và cao ≥ 44px.

`tests/catalog.test.ts` thêm 3 bài khoá hai đầu khớp nhau (cận trên bao được mọi
sản phẩm · lọc đúng bằng cận trên thì không mất món nào · hai cận tròn bước
10.000), và 20 kiểm tra chạy tay qua trình duyệt ở 1440/390px.

## M6.10 — Mật khẩu: nhập hai lần và lấy lại được

Hai lỗ hổng cùng nằm quanh mật khẩu. Đăng ký chỉ có **một** ô mật khẩu, nên gõ
lệch một ký tự là khách tạo tài khoản với mật khẩu chính mình không biết — mà
đúng lúc đó lại **không có đường lấy lại**, vì quên mật khẩu chưa làm. Hai cái
cộng lại thành mất tài khoản ngay từ ngày đầu.

**Nhập lại mật khẩu.** Thêm `password2`, kiểm bằng `superRefine` trong
`registerSchema` — tức kiểm ở **server**, không chỉ ngoài trình duyệt. Lỗi trỏ
đúng vào `path: ["password2"]` để form tô đúng ô.

Vá kèm một lỗi cũ cùng họ với lỗi ở màn thanh toán: React 19 **tự reset**
`<form action={...}>` sau mỗi lượt chạy, nên gõ lệch ô nhập lại là mất luôn họ
tên, số điện thoại, email đã điền. Action trả `values` về, form dựng lại theo
`key`. **Mật khẩu không nằm trong `values`** — trả ngược về là đem mật khẩu ra
nằm trong HTML của trang và đi qua mạng thêm một lượt nữa; hai ô đó gõ lại từ
đầu, vì đó chính là chỗ vừa sai.

**Quên mật khẩu.** Bảng `PasswordReset` (giống `StaffInvite` nhưng hạn ngắn hơn
nhiều), `/quen-mat-khau` và `/dat-lai-mat-khau/[token]`.

Ba luật an toàn, mỗi luật hỏng là mất tài khoản chứ không phải hiển thị xấu:

1. **Không tiết lộ tài khoản có tồn tại hay không.** Form trả về **đúng một
   câu**, dù tìm thấy hay không, kể cả khi lỗi kỹ thuật (bắt và ghi log, không
   để 500 lộ ra). Trả lời khác nhau là biến form thành máy dò: gõ lần lượt vài
   nghìn số là biết số nào có tài khoản ở cửa hàng.
2. **Token dùng một lần, hạn 1 giờ.** Lời mời nhân viên để 7 ngày vì đó là thứ
   người ta đang chờ; token này là chìa vào một tài khoản **đã có**. Hạn và
   trạng thái kiểm **lại bên trong transaction** — giữa lúc mở trang và lúc bấm
   nút, token có thể đã bị một yêu cầu mới huỷ mất.
3. **Xin cái mới thì cái cũ chết ngay.** Bấm “gửi lại” vài lần không rải ra vài
   cái chìa cùng mở một cửa.

Thêm hai chốt: tài khoản `active = false` **không** lấy lại được mật khẩu — tắt
tài khoản là để chặn người đó vào, cho đặt lại là mở lại cửa; và mật khẩu mới tối
thiểu **8 ký tự**, chặt hơn mức 6 lúc đăng ký, vì người đang đặt lại thường là
người vừa mất quyền vào tài khoản. Form giới hạn 5 lượt/IP/giờ: gửi được mà không
cần đăng nhập, mỗi lượt là một email rời khỏi hệ thống, không chặn thì nó thành
công cụ dội thư vào hộp thư người khác.

**Một lỗi tự bắt được khi viết test:** bài kiểm “số lạ phải trả về không-gửi”
dùng số `0900000001` mà tôi bịa cho có vẻ lạ — hoá ra đúng là số của tài khoản
quản trị trong seed, nên bài kiểm đi tra một tài khoản có thật và đỏ. Test giờ
hỏi thẳng DB xin một số chưa ai dùng thay vì đoán.

**Thu hồi phiên — phần thứ ba, làm ngay sau.** Đổi mật khẩu xong mà phiên đang
mở ở máy khác vẫn sống thì việc đổi gần như vô nghĩa: người ta đi đặt lại mật
khẩu chính vì nghi có kẻ vào được tài khoản, và kẻ đó vẫn ngồi nguyên bên trong.

Không xoá được từng phiên vì phiên là JWT — và đó **không phải lựa chọn kiến
trúc**: Auth.js chỉ cho dùng phiên lưu DB với provider bên ngoài, provider
`credentials` bắt buộc dùng JWT. Nên làm theo mốc: `User.sessionsValidFrom`,
token phát trước mốc coi như chết, `datLaiMatKhau` đẩy mốc lên **trong cùng
transaction** với mật khẩu. Callback `jwt` đọc lại `active` + mốc + vai trò từ DB
mỗi lượt (bọc `cache()`, một request một lần) và trả `null` khi hỏng.

Một chi tiết suýt tự bắn vào chân: `iat` chỉ mịn tới **giây**, mốc có mili-giây.
So nguyên mili-giây thì đổi mật khẩu lúc `12:00:00.700` rồi đăng nhập lại lúc
`12:00:00.900` cho token `iat = 12:00:00` — nhỏ hơn mốc, người vừa đổi mật khẩu
bị đá ra ngay tại giây họ đăng nhập. `phienConSong` cắt cả hai về giây, đổi lại
chấp nhận cửa sổ một giây.

Cái giá: thêm một truy vấn DB mỗi lượt đọc phiên. Trả để đổi lấy việc tắt tài
khoản và thu hồi phiên có tác dụng **ngay lượt tải kế tiếp**, thay vì đợi token
hết hạn.

**Xong khi:** đăng ký gõ lệch bị chặn mà không mất dữ liệu đã điền · xin link →
đặt mật khẩu mới → đăng nhập bằng mật khẩu mới · mật khẩu cũ chết · bấm lại link
cũ ra màn “không dùng được” · **chép cookie phiên ra rồi nhét lại sau khi đổi mật
khẩu thì không vào được nữa**.

`tests/password-reset.test.ts` (15 bài) + `tests/session.test.ts` (7 bài), và hai
lượt chạy tay qua trình duyệt: 22 kiểm tra cho luồng mật khẩu (gồm 390px) và 13
kiểm tra cho thu hồi phiên. Lượt chạy tay là bắt buộc ở đây — unit test không
chứng minh được `return null` trong callback `jwt` có thật sự xoá cookie phiên
hay không.

## M6.9 — Gửi email

Trước đó hệ thống **thu email ở bốn chỗ mà không gửi gì**: mời nhân viên, xác
nhận đơn, hoá đơn VAT, trả lời hỗ trợ. (Thư đặt lại mật khẩu là loại thứ năm,
thêm ở M6.10.)

`src/server/mail.ts` + `mail-templates.ts`, chọn nhà cung cấp bằng biến môi
trường. Chưa có khoá thì dùng được ngay ở chế độ `console`.

**Ba quyết định đứng sau lớp này:**

1. **Mặc định `MAIL_PROVIDER=console`: ghi ra log, không gửi đi đâu.** Chưa có
   khoá thì phải thấy rõ là chưa gửi. Giá trị lạ cũng rơi về `console` chứ không
   im lặng thử gửi. Im lặng nuốt rồi báo “đã gửi” là kiểu hỏng tệ nhất — cửa hàng
   tưởng khách đã nhận hoá đơn trong khi không có gì rời máy.
2. **Gửi mail không bao giờ làm hỏng việc chính.** `guiMail` **không ném lỗi**;
   nó trả kết quả và ghi log. Riêng đường đặt đơn còn bọc thêm try/catch: đơn đã
   nằm trong DB rồi, lỗi mail mà kéo theo lỗi ở đó thì khách thấy “không đặt
   được đơn” và đặt lại thành hai đơn.
3. **Không phụ thuộc thư viện nào** — Resend gọi bằng HTTPS thuần, chạy được ở
   mọi runtime.

Màn mời nhân viên **luôn hiện đường dẫn** kể cả khi mail đã gửi được: mail có thể
rơi vào hộp thư rác và người mời cần một đường lui. Khi chưa bật gửi thật, câu
thông báo nói đúng điều đó thay vì giả vờ đã gửi.

**Xong khi:** điền `RESEND_API_KEY` vào `.env`, đổi `MAIL_PROVIDER=resend`, mời
một người và thư tới hộp thư thật — không sửa một dòng mã nào.

## M6.8 — Phân quyền theo khả năng

Trước đó quyền là **danh sách vai trò viết cứng** rải ở 14 trang
(`requireStaff(["ACCOUNTANT","ADMIN"])`); đổi vai trò được làm gì thì phải sửa mã
và deploy. Giờ tách làm hai tầng:

- **Danh mục khả năng** (`src/lib/permissions.ts`) — tập cố định khai trong mã.
  Mỗi khoá tương ứng một chốt chặn có thật; cho tạo khả năng mới từ giao diện
  chỉ sinh ra những dòng không chặn gì cả.
- **Ma trận vai trò × khả năng** (`RolePermission`) — sửa được trong Cài đặt.
- `requirePermission("kho.ghi-so")` thay cho `requireStaff([...])` ở trang, và
  `assertPermission` ở Server Action. Sidebar cũng lọc theo khả năng — liệt kê
  vai trò ở đó thì đổi quyền xong sidebar vẫn hiện y như cũ.

**Thành viên:** mời bằng email (đường dẫn có token, hạn 7 ngày, người được mời tự
đặt mật khẩu), sửa tên/email, bật/tắt, xoá. Đăng nhập nhận **số điện thoại hoặc
email** — người được mời qua email không có số nào cả, chỉ nhận số là mời người ta
vào rồi khoá cửa không cho vào.

**Bốn chốt an toàn:**

1. **ADMIN luôn có mọi khả năng**, chốt trong `canDo` chứ không phải dữ liệu sửa
   được. Gỡ đúng `phan-quyen.quan-ly` là không còn ai vào được màn này để sửa lại.
2. **Không hạ hay tắt người quản trị cuối cùng** — và quản trị *đã tắt* không tính
   là người còn lại.
3. **Tài khoản tắt bị chặn ngay**: `guard.ts` đọc lại `active` và `role` từ DB mỗi
   lần chứ không tin JWT. Phiên đăng nhập sống hàng ngày, mà tắt một tài khoản thì
   phải có tác dụng ngay chứ không đợi người đó tự đăng xuất.
4. **Không xoá người đã phát hành hoá đơn** — chỉ tắt, để chứng từ không mồ côi.

**Lỗ hổng có sẵn phát hiện khi làm:** *tám* trang quản trị (`/admin/nhap-kho`,
`/admin/san-pham/[slug]`, `/admin/don-hang`…) chưa bao giờ có chốt riêng, chỉ dựa
vào guard ở layout — thứ chỉ kiểm “có phải nhân viên không”. Kế toán mở thẳng
`/admin/nhap-kho` là vào được màn ghi sổ kho; sidebar có ẩn mục đó nhưng ẩn nút
không phải là kiểm soát. Đã vá cả tám, và `tests/permissions.test.ts` **quét mã
nguồn** để thêm trang mới mà quên chốt là đỏ ngay.

**Xong khi:** bỏ tick một khả năng thì người giữ vai trò đó mở thẳng đường dẫn
cũng bị chặn, không phải chỉ mất mục trên sidebar.

## M6.7 — Cài đặt cửa hàng

Mục sidebar cuối cùng. Màn `settings` của mockup có hai nhóm (Thông tin cửa hàng,
Vận chuyển & thuế), bảng Người dùng & phân quyền, và danh sách phương thức thanh
toán. Thêm một nhóm mockup không có: **phân hạng khách hàng**.

**Việc chính không phải dựng form, mà là thu những con số rải rác về một chỗ.**
Trước đó `VAT_RATE`, `FREE_SHIP_THRESHOLD`, `GIU_DON_PHUT`, `TIER_THRESHOLD` mỗi
thứ là một hằng số trong mã, và thông tin cửa hàng lặp ở **tám** file — đổi địa
chỉ cửa hàng phải sửa từng chỗ và luôn sót một cái.

- Bảng `StoreSetting` **một dòng**: `id` có giá trị mặc định cố định nên không
  thể lỡ tay tạo dòng thứ hai.
- Migration **chèn sẵn đúng giá trị đang hardcode**, nên chạy xong hệ thống hành
  xử y hệt. Đổi hành vi là việc của người bấm Lưu, không phải tác dụng phụ của
  việc nâng cấp.
- `tierFor` nhận ngưỡng làm **tham số** thay vì đọc hằng số. Giữ một bản mặc định
  trong `lib/tiers.ts` rồi lỡ quên truyền vào là hai màn hình cùng một khách ra
  hai hạng khác nhau.
- `getSettings` bọc trong `cache()` của React: một lần render có năm nơi cùng cần
  thuế suất và thông tin cửa hàng.
- **Không tự tạo lại dòng cài đặt khi thiếu.** Thiếu nghĩa là DB chưa chạy hết
  migration; tạo lại bằng giá trị mặc định sẽ giấu chuyện đó đi và cửa hàng chạy
  tiếp với thuế suất sai mà không ai biết.

**Ba chốt chặn ở server:**

1. Ngưỡng hạng phải tăng dần. Đặt VÀNG thấp hơn BẠC thì hàm vẫn chạy nhưng hạng
   VÀNG không bao giờ với tới được — hỏng im lặng.
2. Không tắt hết phương thức thanh toán, nếu không khách không đặt được đơn nào.
3. Không hạ người quản trị cuối cùng, và không tự đổi vai trò của chính mình.

Khối phân hạng có **bảng thử ngay tại chỗ**: gõ một số tiền, thấy ngay hạng mà
ngưỡng đang gõ dở sẽ cho ra, kèm sáu mốc quanh ba ngưỡng. Đặt ngưỡng mà không
thấy hệ quả là đẩy sai sót tới lúc khách gọi lên hỏi.

**Lệch mockup có chủ ý:** nút “Mời thành viên” qua email — chưa có hệ thống gửi
mail. Cách chạy được ngay: người đó tự đăng ký như khách, quản trị nâng vai trò.
Ghi rõ dưới bảng thay vì bày một nút không gửi được gì.

**Ảnh QR chuyển khoản.** Tải lên trong Cài đặt, hiện 150×150 ở khối chuyển khoản
tại bước thanh toán — **mockup vốn có tấm ảnh này**, tôi dựng thiếu ở M5. Ảnh lưu
trong DB như ảnh sản phẩm (M4.5) nhưng nén **không mất dữ liệu**: nén lossy làm
nhiễu cạnh các ô vuông và máy quét có thể đọc không ra, mà đọc được là toàn bộ lý
do tấm ảnh tồn tại. Lossless trên ảnh hai màu lại còn nhỏ hơn lossy — QR thật chỉ
dưới 1 KB.

Blob chia sẻ theo checksum nên dọn phải cẩn thận **hai chiều**: gỡ QR không được
xoá blob đang là ảnh sản phẩm, và xoá ảnh sản phẩm không được xoá blob đang là QR.
Cả hai chiều đều có test.

**Xong khi:** đổi ngưỡng hạng trong cài đặt thì hạng khách trong bảng đổi theo,
không phải sửa mã và deploy lại.

## M6.6 — Khách hàng

Mục sidebar cuối cùng mockup đã thiết kế mà chưa milestone nào nhận. Màn
`customers`: bảng Khách hàng · Số điện thoại · Số đơn · Tổng chi tiêu · Hạng.

- **Phân hạng theo chi tiêu 12 tháng**, ngưỡng lấy đúng mockup và dùng dấu *lớn
  hơn chặt*: tiêu đúng 4.000.000 ₫ vẫn là VÀNG. Nghe như chuyện nhỏ, nhưng đây là
  con số khách đếm từng đồng rồi gọi lên hỏi khi thấy lệch — nên ngưỡng nằm ở
  `src/lib/tiers.ts` và có test riêng cho từng biên.
- **Chi tiêu đếm cùng luật với báo cáo doanh thu**: bỏ đơn huỷ và đơn trả hàng.
  Hai chỗ đếm khác nhau thì kế toán và nhân viên bán hàng sẽ cãi nhau về cùng một
  con số.
- Hồ sơ khách: đơn gần đây, sổ điểm, sổ địa chỉ, và số tiền còn thiếu để lên hạng.
- “+ Thêm khách hàng” cho khách mua tại quầy: sinh **mật khẩu tạm** hiện đúng một
  lần để nhân viên đọc cho khách. Không lưu bản rõ, không có màn xem lại — tra ra
  được mật khẩu cũ nghĩa là hệ thống đang giữ nó ở dạng đọc được.

**Xong khi:** tra được một khách, thấy đúng hạng và đúng tổng chi tiêu 12 tháng.

## M6.5 — Giao hàng nhập tay

**Thay cho M7 ở giai đoạn này.** Nối API hãng vận chuyển chỉ đáng làm khi có lưu
lượng thật; trước đó cửa hàng tự bàn giao và tự gõ mã vận đơn nhanh hơn nhiều so
với chờ tích hợp.

Máy trạng thái từ M3 vốn đã đủ để nhân viên đẩy đơn `PENDING → … → DELIVERED`.
Chỗ thiếu duy nhất là đường **nhập** mã vận đơn: cột `trackingCode` có sẵn trong
schema từ M0 và màn tra cứu của khách đã biết hiển thị, nhưng không màn nào cho
nhập vào.

- Khối Vận chuyển ở chi tiết đơn: chọn hãng, nhập mã, mỗi lần đổi ghi một dòng
  `OrderEvent` — ba tháng sau khách khiếu nại “shop đưa nhầm mã” còn tra được ai
  nhập, lúc nào.
- **Chặn chuyển sang `SHIPPING` khi chưa có mã vận đơn.** Đơn ở trạng thái “đang
  giao” mà không tra được ở đâu là đẩy việc sang tổng đài: khách gọi hỏi hàng ở
  đâu và không ai trả lời được. “Nhận tại cửa hàng” được miễn vì không có mã.
- Đơn đã huỷ hoặc đã trả hàng thì khoá, không sửa vận chuyển nữa.

**Xong khi:** nhân viên bàn giao hàng cho hãng, gõ mã vào, và khách tra đơn thấy
đúng mã đó — không cần một dòng tích hợp nào.

**Đường lên M7 sau này:** thay chỗ nhập tay bằng lời gọi API tạo vận đơn, giữ
nguyên cột `trackingCode` và toàn bộ UI hiển thị. Webhook trạng thái chỉ việc gọi
`advanceOrderStatus` thay cho người bấm nút.

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
9. **Đừng để cột `Bytes` chung bảng `ProductImage`.** Prisma hay lấy cả bản ghi; để chung thì mọi truy vấn catalog kéo theo hàng MB ảnh — trang danh sách 12 sản phẩm là 12 MB đi qua connection pool.
10. **Đừng phục vụ ảnh mà không có cache header.** Mỗi lượt xem thành một lần chạy hàm cộng một truy vấn DB. Có `immutable` thì CDN gánh gần hết.

---

## Trước khi lên production

Không thuộc milestone nào nhưng chặn việc chạy thật. Xếp theo mức nguy hiểm:

1. **Migration** — làm ở M4.5. Càng để lâu càng đắt.
2. **Rate limit đang đếm trong bộ nhớ tiến trình** (`src/server/rate-limit.ts`). Trên serverless mỗi instance đếm riêng nên "10 lượt/IP/giờ" thành 10 × số instance. Đổi sang Upstash Redis.
3. **Prisma cần connection pooler.** Mỗi lambda mở một kết nối; Neon có pooler sẵn — `DATABASE_URL` bản pooled cho app, `DIRECT_URL` cho migration.
4. **`AUTH_SECRET` đang là chuỗi mẫu.** `openssl rand -base64 32`, đặt bằng biến môi trường.
5. **19 trang đang `force-dynamic`** nên mỗi lượt xem đều truy vấn DB. Chịu được ở vài trăm đơn/ngày; có lưu lượng thật thì chuyển trang danh mục và chi tiết sang ISR. Tối ưu sau, không phải blocker.

---

## Hạ tầng triển khai — đã chốt

**Một VPS ở Singapore, Docker Compose gồm Next.js + Postgres + Caddy.** Khoảng $5–6/tháng, giá cố định.

Lý do không phải "rẻ hơn" chung chung, mà vì hai quyết định đã chốt đều đẩy khỏi serverless:

| Quyết định | Trên serverless | Trên VPS |
|---|---|---|
| Ảnh lưu trong DB (M4.5) | Mỗi lượt xem ảnh = 1 lần chạy hàm + 1 truy vấn DB qua mạng | Postgres ở `localhost`, đọc ảnh gần như miễn phí |
| 19 trang `force-dynamic` | Edge cache không giúp gì, mọi request đều chạy hàm | Không mất gì, vốn dĩ đã dynamic |

Serverless đắt ở **số lượt gọi hàm**. App này vừa dynamic toàn bộ vừa phục vụ ảnh qua hàm — đúng hình dạng tệ nhất cho mô hình đó.

Singapore về VN độ trễ ~30–50ms. **Đừng chọn VPS châu Âu** dù rẻ hơn: ~250ms là cảm nhận được rõ. Khi tới M8 (hoá đơn điện tử, MISA) thì cân nhắc chuyển về VPS trong nước.

### Cần dựng

1. `output: "standalone"` trong `next.config.ts` — image từ ~1GB xuống ~150MB.
2. `Dockerfile` multi-stage.
3. `docker-compose.yml`: app + postgres + caddy. Caddy tự xin và gia hạn TLS.
4. Thêm job vào CI: build image, đẩy lên GHCR. **VPS chỉ `pull`, không build** — `next build` mới là thứ ngốn RAM, nhờ vậy 2GB là dư.
5. Cron `pg_dump` hằng ngày, nén rồi đẩy ra ngoài máy.

Việc 5 quan trọng hơn bình thường **vì ảnh nằm trong DB** — mất DB là mất cả ảnh lẫn đơn hàng. Bù lại chỉ còn một thứ duy nhất phải backup.

### Nhược điểm phải biết trước

- **Không HA.** VPS chết là web chết. Chấp nhận được ở giai đoạn thử nghiệm, không chấp nhận được khi có doanh thu thật.
- Tự cập nhật OS, khoảng 15 phút mỗi tháng.
- Deploy là `docker compose pull && up -d`, không phải `git push` rồi tự xong.

### Phương án thay thế

Muốn không vận hành gì cả thì chọn **Railway** — Postgres kèm sẵn, có region Singapore, deploy từ GitHub. Đắt hơn chút và hoá đơn theo mức dùng, đổi lại không phải chạm TLS hay backup.

**Đừng dùng Vercel Hobby cho web bán hàng thật** — không phải vì kỹ thuật mà vì điều khoản dịch vụ cấm dùng thương mại. Bản Pro hợp lệ nhưng $20/tháng cho thứ app này không dùng tới.
