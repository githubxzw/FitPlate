import { describe, expect, it, beforeEach, vi, afterEach } from "vitest";
import { rateLimit, clientIp, loginGuard } from "@/lib/rate-limit";

beforeEach(() => {
  loginGuard.reset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("rateLimit 滑动窗口", () => {
  it("限额内放行,超出后拒绝并返回重试秒数", () => {
    const key = "test:limit1";
    for (let i = 0; i < 3; i++) {
      expect(rateLimit(key, 3, 60_000).ok).toBe(true);
    }
    const blocked = rateLimit(key, 3, 60_000);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
    expect(blocked.retryAfterSec).toBeLessThanOrEqual(60);
  });

  it("窗口滑过后重新放行", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-30T10:00:00Z"));
    const key = "test:limit2";
    for (let i = 0; i < 2; i++) expect(rateLimit(key, 2, 60_000).ok).toBe(true);
    expect(rateLimit(key, 2, 60_000).ok).toBe(false);
    vi.advanceTimersByTime(61_000); // 窗口整体滑出
    expect(rateLimit(key, 2, 60_000).ok).toBe(true);
  });

  it("不同 key 相互隔离", () => {
    expect(rateLimit("a", 1, 60_000).ok).toBe(true);
    expect(rateLimit("a", 1, 60_000).ok).toBe(false);
    expect(rateLimit("b", 1, 60_000).ok).toBe(true);
  });
});

describe("clientIp", () => {
  it("优先取 X-Forwarded-For 首段", () => {
    const req = new Request("http://localhost", { headers: { "x-forwarded-for": "1.2.3.4, 10.0.0.1" } });
    expect(clientIp(req)).toBe("1.2.3.4");
  });
  it("无代理头时回退 X-Real-IP / local", () => {
    expect(clientIp(new Request("http://localhost", { headers: { "x-real-ip": "5.6.7.8" } }))).toBe("5.6.7.8");
    expect(clientIp(new Request("http://localhost"))).toBe("local");
  });
});

describe("loginGuard 登录失败锁定", () => {
  it("连续失败 10 次后锁定 30 分钟", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-30T10:00:00Z"));
    for (let i = 0; i < 10; i++) loginGuard.recordFail("a@b.com");
    expect(loginGuard.isLocked("a@b.com")).toBe(true);
    // 锁定期间失败不再累计(锁定到期后重新计数)
    loginGuard.recordFail("a@b.com");
    vi.advanceTimersByTime(29 * 60_000);
    expect(loginGuard.isLocked("a@b.com")).toBe(true);
    vi.advanceTimersByTime(2 * 60_000);
    expect(loginGuard.isLocked("a@b.com")).toBe(false);
  });

  it("成功登录清除失败计数", () => {
    for (let i = 0; i < 9; i++) loginGuard.recordFail("c@d.com");
    loginGuard.recordSuccess("c@d.com");
    for (let i = 0; i < 5; i++) loginGuard.recordFail("c@d.com");
    expect(loginGuard.isLocked("c@d.com")).toBe(false);
  });

  it("不同账号互不影响", () => {
    for (let i = 0; i < 10; i++) loginGuard.recordFail("x@y.com");
    expect(loginGuard.isLocked("x@y.com")).toBe(true);
    expect(loginGuard.isLocked("other@y.com")).toBe(false);
  });
});
