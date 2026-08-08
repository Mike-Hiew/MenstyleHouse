import "server-only";

/**
 * Giới hạn tần suất trong bộ nhớ tiến trình. Đủ cho tra cứu đơn ở M2
 * (`docs/API.md`: 10 lượt/IP/giờ) và không thêm phụ thuộc nào.
 *
 * Hạn chế phải biết: chạy nhiều instance thì mỗi instance đếm riêng. Khi lên
 * nhiều máy chủ phải đổi sang bộ đếm dùng chung (Redis) — ghi lại ở đây để
 * người sau không tưởng nhầm là đã an toàn tuyệt đối.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/** Dọn các ô đã hết hạn để Map không phình mãi. */
function sweep(now: number) {
  if (buckets.size < 5_000) return;
  for (const [key, b] of buckets) if (b.resetAt <= now) buckets.delete(key);
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { ok: boolean; remaining: number; retryAfterSec: number } {
  const now = Date.now();
  sweep(now);

  const found = buckets.get(key);
  if (!found || found.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterSec: 0 };
  }

  if (found.count >= limit) {
    return { ok: false, remaining: 0, retryAfterSec: Math.ceil((found.resetAt - now) / 1000) };
  }

  found.count += 1;
  return { ok: true, remaining: limit - found.count, retryAfterSec: 0 };
}

/** 10 lượt tra cứu mỗi IP mỗi giờ. */
export function limitOrderLookup(ip: string) {
  return rateLimit("lookup:" + ip, 10, 60 * 60 * 1000);
}
