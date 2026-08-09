import "server-only";
import Redis from "ioredis";

/**
 * Giới hạn tần suất.
 *
 * **Dùng Redis khi có `REDIS_URL`, không có thì đếm trong RAM.** Bộ đếm trong
 * RAM chỉ đúng khi chạy đúng một tiến trình: lên hai instance là mỗi bên đếm
 * riêng và trần thật cao gấp đôi. Nhưng bắt buộc phải có Redis mới chạy được
 * thì dựng máy dev cũng phải cài Redis — nên đường lui vào RAM giữ nguyên, và
 * **nói rõ ra ở log lúc khởi động** thay vì im lặng.
 *
 * Redis chết giữa chừng thì rơi về RAM chứ không chặn người dùng: giới hạn tần
 * suất là lớp bảo vệ, không phải cửa chính. Chặn hết vì Redis rớt là tự khoá
 * cửa hàng.
 */

export type KetQua = { ok: boolean; remaining: number; retryAfterSec: number };

/* ── Đường lui: đếm trong RAM ─────────────────────────────── */

type O = { count: number; resetAt: number };
const trongRam = new Map<string, O>();

function don(now: number) {
  if (trongRam.size < 5_000) return;
  for (const [k, o] of trongRam) if (o.resetAt <= now) trongRam.delete(k);
}

function demTrongRam(key: string, limit: number, windowMs: number): KetQua {
  const now = Date.now();
  don(now);

  const co = trongRam.get(key);
  if (!co || co.resetAt <= now) {
    trongRam.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterSec: 0 };
  }
  if (co.count >= limit) {
    return { ok: false, remaining: 0, retryAfterSec: Math.ceil((co.resetAt - now) / 1000) };
  }
  co.count += 1;
  return { ok: true, remaining: limit - co.count, retryAfterSec: 0 };
}

/* ── Redis ────────────────────────────────────────────────── */

let redis: Redis | null = null;
let daBao = false;

function noi(): Redis | null {
  const url = process.env.REDIS_URL?.trim();
  if (!url) {
    if (!daBao) {
      daBao = true;
      console.info("[rate-limit] Không có REDIS_URL — đếm trong RAM, chỉ đúng khi chạy 1 instance.");
    }
    return null;
  }
  if (redis) return redis;

  redis = new Redis(url, {
    maxRetriesPerRequest: 1,
    // Không để kết nối hỏng làm treo request: thà rơi về RAM còn hơn chờ.
    connectTimeout: 1000,
    lazyConnect: false,
  });
  redis.on("error", (e) => console.error("[rate-limit] Redis lỗi:", e.message));
  return redis;
}

export async function rateLimit(key: string, limit: number, windowMs: number): Promise<KetQua> {
  const r = noi();
  if (!r) return demTrongRam(key, limit, windowMs);

  try {
    const k = "rl:" + key;
    /*
     * `INCR` rồi đặt hạn cho lượt đầu. Hai lệnh trong một pipeline nên không có
     * khoảng hở cho một request khác chen vào giữa và làm mất hạn.
     */
    const [[, dem], [, con]] = (await r
      .multi()
      .incr(k)
      .pttl(k)
      .exec()) as [[Error | null, number], [Error | null, number]];

    if (con < 0) await r.pexpire(k, windowMs);

    if (dem > limit) {
      return {
        ok: false,
        remaining: 0,
        retryAfterSec: Math.ceil((con > 0 ? con : windowMs) / 1000),
      };
    }
    return { ok: true, remaining: limit - dem, retryAfterSec: 0 };
  } catch (e) {
    console.error("[rate-limit] Redis không trả lời, tạm đếm trong RAM:", (e as Error).message);
    return demTrongRam(key, limit, windowMs);
  }
}

/** 10 lượt tra cứu mỗi IP mỗi giờ. */
export function limitOrderLookup(ip: string) {
  return rateLimit("lookup:" + ip, 10, 60 * 60 * 1000);
}
