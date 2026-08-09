# Triển khai

Ba container trên một máy: **Caddy → app → Postgres**. Không có Redis, cố ý —
`rateLimit` đếm trong RAM khi thiếu `REDIS_URL`, và bộ đếm trong RAM đúng khi
chỉ có một tiến trình app.

Chạy được cả trên máy cá nhân lẫn VPS; khác nhau chỉ ở tên miền và cách mở cổng.

## Cần sẵn

- Docker + Docker Compose v2
- Máy tối thiểu **2 GB RAM**, cộng 2 GB swap
- Tên miền trỏ về máy, cổng 80/443 vào được từ Internet (Caddy cần để xin
  chứng chỉ Let's Encrypt)

**Đừng dựng ảnh trên máy 2 GB.** `next build` một mình đã ngốn ~2 GB; dựng ngay
cạnh Postgres đang chạy là OOM giữa lúc bán hàng. Dựng ở máy dev hoặc CI rồi đẩy
lên registry, máy chủ chỉ `pull`.

## Các bước

### 1. Cấu hình

```sh
cp .env.production.example .env.production
chmod 600 .env.production
```

Điền theo hướng dẫn trong file. Ba chỗ hay sai:

| Biến | Sai thường gặp |
|---|---|
| `DATABASE_URL` | ghi `localhost` — trong mạng compose phải là `postgres` |
| `AUTH_URL` / `APP_URL` | không đổi khỏi localhost → link đặt lại mật khẩu trong mail trỏ về máy người nhận |
| `TRUSTED_PROXY_HOPS` | xem mục dưới |

Sinh bí mật mới cho production, **đừng dùng lại khoá của máy dev**:

```sh
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"   # AUTH_SECRET
```

### 2. Chạy

```sh
docker compose --env-file .env.production up -d
```

Luôn kèm `--env-file`. `env_file:` trong compose chỉ nạp biến **vào trong
container**; còn `${...}` ngay trong `docker-compose.yml` thì compose nội suy từ
shell hoặc từ `.env` — mà `.env` ở đây là của máy dev. Thiếu cờ đó là compose
dừng ngay với `required variable POSTGRES_PASSWORD is missing`.

**Lên phiên bản thì phải kèm `--build`:**

```sh
docker compose --env-file .env.production up -d --build
```

`up` không tự dựng lại khi ảnh đã có sẵn — nó thấy ảnh cùng tên là dùng luôn.
Sửa mã xong gõ `up -d` trơn thì container vẫn chạy bản cũ, không báo gì cả, và
mất cả buổi để hiểu vì sao thay đổi không có tác dụng.

Thứ tự tự lo: Postgres khoẻ → `migrate` chạy `prisma migrate deploy` rồi thoát →
app khởi động. Migration nằm ở service riêng chứ không nhét vào lúc app khởi
động: lên nhiều bản sao thì mỗi bản sẽ tự chạy migration một lần, cùng lúc, trên
cùng một cơ sở dữ liệu.

### 3. Dữ liệu ban đầu — chỉ một lần

```sh
SEED_PASSWORD='<mật khẩu mạnh>' docker compose --env-file .env.production \
  run --rm migrate npm run db:seed
```

Xong thì đăng nhập và đổi mật khẩu quản trị ngay.

### 4. Cron dọn đơn quá hạn

Crontab trên máy chủ, 10 phút một lần:

```
*/10 * * * * curl -fsS -H "Authorization: Bearer $CRON_SECRET" \
  https://menstylehouse.vn/api/cron/huy-don-qua-han >> /var/log/msh-cron.log 2>&1
```

Cho ghi log. Cron hỏng thì im lặng, mà đơn quá hạn nằm lì sẽ giữ tồn kho.

### 5. Sao lưu

```sh
./scripts/sao-luu.sh                 # ghi vào ./sao-luu/, giữ 14 bản
```

Vào crontab 3 giờ sáng. Đặt `RCLONE_DICH` để đẩy luôn ra Cloudflare R2 — bản sao
lưu nằm cùng ổ với dữ liệu gốc thì hỏng ổ là mất cả hai.

**Khôi phục thử một lần trước khi có đơn thật:**

```sh
docker compose --env-file .env.production exec -T postgres \
  pg_restore -U postgres -d menstylehouse --clean --if-exists < sao-luu/msh-....dump
```

Bản sao lưu chưa từng khôi phục thử thì chưa phải bản sao lưu. Nhớ dump sẽ khá
to vì ảnh sản phẩm nằm ngay trong Postgres.

## Hai điều kiện của bản vá đọc IP

Mọi giới hạn theo IP (dội thư đặt lại mật khẩu, dò mã đơn) đều dựa vào đúng một
con số. Thiếu một trong hai điều dưới đây là vá hụt — xem `docs/ARCHITECTURE.md`.

**Caddy ghi đè, không nối.** `Caddyfile` đã đặt sẵn
`header_up X-Forwarded-For {remote_host}`. Mặc định Caddy *nối* IP vào cuối và
giữ nguyên phần khách tự gửi.

**App không vào thẳng được từ Internet.** `docker-compose.yml` cố ý **không**
khai `ports` cho service `app`. Vào thẳng cổng 3000 được là khách tự đặt được
mọi header, kể cả `CF-Connecting-IP`.

Số lớp proxy phải khớp thực tế:

| Kiến trúc | `TRUSTED_PROXY_HOPS` | `TRUSTED_IP_HEADER` |
|---|---|---|
| Chỉ Caddy | `1` | để trống |
| Cloudflare (mây cam) → Caddy | `2` | `cf-connecting-ip` |

Khai thiếu thì cùng lắm chặn nhầm; khai thừa là mở lại đúng lỗ đã vá.

## Nghiệm thu

```sh
curl -sk -o /dev/null -w "%{http_code}\n" https://<domain>/api/suc-khoe   # 200
curl -s  -o /dev/null -w "%{http_code}\n" http://<ip>:3000/               # phải KHÔNG nối được
```

Endpoint sức khoẻ có truy vấn thật vào Postgres — chỉ trả `ok` suông thì nó xanh
cả lúc cơ sở dữ liệu đã chết.

Kiểm giới hạn theo IP còn tác dụng: gọi `/tra-cuu-don?ma=X&sdt=1234` 11 lượt,
mỗi lượt một `-H "X-Forwarded-For: 9.9.9.<n>"` khác nhau. Lượt 11 **phải** bị
chặn. Lọt cả 11 nghĩa là header đang bị tin nhầm.

## Sau này

Khi nào mở bán thật thì thêm ba thứ, cả ba đều không phải sửa mã:

- Cloudflare mây cam + luật WAF cho `/dang-nhap`, `/quen-mat-khau`
- Redis (`REDIS_URL`) — bắt buộc trước khi chạy từ hai bản sao app trở lên
- Bản sao app thứ hai; khi đó **bỏ** service `migrate` khỏi luồng khởi động
  tự động và chạy tay trước mỗi lần lên phiên bản

## Gặp lỗi

| Triệu chứng | Nguyên nhân |
|---|---|
| `required variable POSTGRES_PASSWORD is missing` | quên `--env-file .env.production` |
| `P1012 ... DIRECT_URL` | `schema.prisma` khai `directUrl` mà `.env.production` chưa đặt |
| Caddy không xin được chứng chỉ | Cloudflare đang ở mây cam, hoặc cổng 80 bị chặn |
| `next start does not work with output: standalone` | chỉ là cảnh báo; trong container đã chạy đúng `node server.js` |
| Ảnh Docker dựng lỗi ở `next build` | thiếu biến giả lúc dựng — `Dockerfile` đã đặt sẵn, đừng gỡ |
