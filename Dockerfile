# syntax=docker/dockerfile:1

# ─────────────────────────────────────────────────────────────────────────────
# Nền chung.
#
# Dùng bookworm-slim (glibc) chứ không phải alpine (musl): Prisma và sharp đều
# có bản dựng sẵn cho glibc, còn trên musl thì hay phải biên dịch lại hoặc lôi
# thêm engine khác. Ảnh nhỉnh hơn vài chục MB, đổi lại không mất buổi tối để dò
# xem vì sao sharp không nạp được.
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS base
# openssl: Prisma engine cần. ca-certificates: để gọi Resend/VNPay qua HTTPS.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
ENV NEXT_TELEMETRY_DISABLED=1

# ─── Thư viện ────────────────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app
# Chỉ chép hai file này trước để tầng cài đặt còn dùng lại được cache: sửa mã
# nguồn mà không đụng package-lock thì không phải cài lại từ đầu.
COPY package.json package-lock.json ./
RUN npm ci

# ─── Dựng ────────────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Biến giả chỉ dùng lúc dựng.
#
# `src/auth.ts` cố ý ném lỗi ngay khi nạp nếu thiếu `AUTH_SECRET`, và Next có
# dựng sẵn vài trang tĩnh nên nó thật sự chạy mã đó lúc build. Không đặt gì thì
# `docker build` chết ngay, mà đặt khoá thật vào đây là ghi khoá vào từng tầng
# ảnh cho ai đọc cũng thấy. Khoá thật đến từ `.env.production` lúc chạy.
#
# Đặt ngay trên dòng `RUN` chứ không dùng `ENV`: `ENV` ghi giá trị vào metadata
# của ảnh, ai `docker inspect` cũng đọc được, và nó còn nằm lại trong biến môi
# trường của tiến trình lúc chạy — che mất giá trị thật lấy từ `.env.production`.
RUN AUTH_SECRET="chi-dung-luc-build-khong-phai-khoa-that" \
	DATABASE_URL="postgresql://build:build@127.0.0.1:5432/build" \
	npm run build

# ─── Chạy ────────────────────────────────────────────────────────────────────
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
# Nghe trên mọi giao diện của container. Không mở cổng này ra ngoài máy chủ —
# vào thẳng được app là mọi header đều bịa được, kể cả X-Forwarded-For.
ENV PORT=3000 HOSTNAME=0.0.0.0

RUN groupadd --system --gid 1001 msh && useradd --system --uid 1001 --gid msh msh

# Không chép `public/`: dự án này không có thư mục đó — ảnh sản phẩm nằm trong
# Postgres và phục vụ qua `/api/anh`, còn font thì Next tự gói vào bundle. Thêm
# một dòng COPY cho thư mục không tồn tại là `docker build` đổ ngay.
COPY --from=builder --chown=msh:msh /app/.next/standalone ./
COPY --from=builder --chown=msh:msh /app/.next/static ./.next/static

USER msh
EXPOSE 3000
CMD ["node", "server.js"]
