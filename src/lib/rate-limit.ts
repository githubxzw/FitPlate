// 进程内限流与登录防护(单实例部署足够;多实例部署时换 Redis 实现同接口)

/** 提取客户端 IP(经过 Nginx 反代时取 X-Forwarded-For 首段) */
export function clientIp(req: Request): string {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "local";
}

interface RateLimitResult {
  ok: boolean;
  retryAfterSec: number;
}

const buckets = new Map<string, number[]>();

/** 滑动窗口限流:窗口内第 limit+1 次起拒绝,并返回建议重试秒数 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    const retryAfterSec = Math.ceil((windowMs - (now - hits[0])) / 1000);
    buckets.set(key, hits);
    return { ok: false, retryAfterSec };
  }
  hits.push(now);
  buckets.set(key, hits);

  // 防内存膨胀:桶数量超阈值时清理过期 key
  if (buckets.size > 10_000) {
    for (const [k, v] of buckets) {
      if (v.every((t) => now - t > windowMs)) buckets.delete(k);
    }
    if (buckets.size > 10_000) buckets.clear();
  }
  return { ok: true, retryAfterSec: 0 };
}

// ---------------- 登录失败锁定(按账号) ----------------

const LOCK_THRESHOLD = 10; // 连续失败次数
const LOCK_MS = 30 * 60 * 1000; // 锁定 30 分钟

const failCounts = new Map<string, { count: number; lockedUntil: number }>();

export const loginGuard = {
  isLocked(email: string): boolean {
    const entry = failCounts.get(email);
    return Boolean(entry && entry.lockedUntil > Date.now());
  },

  recordFail(email: string): void {
    const now = Date.now();
    const entry = failCounts.get(email) ?? { count: 0, lockedUntil: 0 };
    if (entry.lockedUntil > now) return; // 已锁定则不累计
    entry.count += 1;
    if (entry.count >= LOCK_THRESHOLD) {
      entry.lockedUntil = now + LOCK_MS;
      entry.count = 0;
    }
    failCounts.set(email, entry);
    if (failCounts.size > 5_000) failCounts.clear();
  },

  recordSuccess(email: string): void {
    failCounts.delete(email);
  },

  /** 测试辅助:清空状态 */
  reset(): void {
    failCounts.clear();
  },
};
