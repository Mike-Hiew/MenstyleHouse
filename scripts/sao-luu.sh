#!/bin/sh
# Sao lưu cơ sở dữ liệu.
#
#   ./scripts/sao-luu.sh                 # ghi vào ./sao-luu/
#   ./scripts/sao-luu.sh /mnt/backup     # ghi vào chỗ khác
#
# Đặt vào crontab, 3 giờ sáng mỗi ngày:
#   0 3 * * * cd /srv/msh && ./scripts/sao-luu.sh >> /var/log/msh-sao-luu.log 2>&1
#
# LƯU Ý VỀ DUNG LƯỢNG: ảnh sản phẩm nằm ngay trong Postgres (`ProductImageBlob`)
# nên bản dump to hơn hẳn một cửa hàng thường. Định dạng `-Fc` đã nén sẵn, nhưng
# vẫn phải canh đĩa.
set -eu

THU_MUC="${1:-./sao-luu}"
GIU_LAI=14

mkdir -p "$THU_MUC"
TEN="$THU_MUC/msh-$(date +%Y%m%d-%H%M%S).dump"

# `-Fc` = định dạng nén của Postgres, khôi phục bằng `pg_restore` và chọn được
# từng bảng. Dump SQL thuần thì to gấp mấy lần và phải nạp trọn gói.
#
# `exec -T` chứ không phải `run`: `run` dựng thêm một container mới mỗi lần chạy.
docker compose exec -T postgres \
	pg_dump -U postgres -d menstylehouse -Fc >"$TEN"

# Dump rỗng vẫn là một file, và cron thì im lặng. Không kiểm ở đây thì hôm hỏng
# việc mới biết mình đã giữ 14 bản sao lưu rỗng.
KICH_THUOC=$(wc -c <"$TEN")
if [ "$KICH_THUOC" -lt 100000 ]; then
	echo "LỖI: bản dump chỉ có $KICH_THUOC byte — quá nhỏ, gần như chắc chắn hỏng." >&2
	rm -f "$TEN"
	exit 1
fi

echo "$(date '+%F %T')  đã lưu $TEN ($((KICH_THUOC / 1024 / 1024)) MB)"

# Dọn bản cũ, giữ lại $GIU_LAI bản gần nhất.
ls -1t "$THU_MUC"/msh-*.dump 2>/dev/null | tail -n +$((GIU_LAI + 1)) | while read -r cu; do
	echo "  dọn bản cũ: $cu"
	rm -f "$cu"
done

# Đẩy ra khỏi máy nếu đã cấu hình rclone. Bản sao lưu nằm cùng ổ đĩa với dữ liệu
# gốc thì hỏng ổ là mất cả hai.
if [ -n "${RCLONE_DICH:-}" ] && command -v rclone >/dev/null 2>&1; then
	rclone copy "$TEN" "$RCLONE_DICH" && echo "  đã đẩy lên $RCLONE_DICH"
fi
