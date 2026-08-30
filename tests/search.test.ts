import { describe, expect, it, vi } from "vitest";
import { dedupeAndFilter, isTrustedUrl, searchSources, TRUSTED_DOMAINS } from "@/lib/search";
import type { SourceRef } from "@/types";

const src = (url: string, title = url): SourceRef => ({
  title,
  url,
  source: "x",
  accessedAt: new Date().toISOString(),
});

describe("可信域名白名单", () => {
  it("放行 WHO / NIH / 中国营养学会 及其子域", () => {
    expect(isTrustedUrl("https://www.who.int/news-room/fact-sheets/detail/healthy-diet")).toBe(true);
    expect(isTrustedUrl("https://ods.od.nih.gov/factsheets/list-all/")).toBe(true);
    expect(isTrustedUrl("http://dg.cnsoc.org/")).toBe(true);
  });

  it("拦截相似域名与不可信域名", () => {
    expect(isTrustedUrl("https://who.int.evil.example.com/a")).toBe(false);
    expect(isTrustedUrl("https://notwho.int/a")).toBe(false);
    expect(isTrustedUrl("https://example.com/a")).toBe(false);
    expect(isTrustedUrl("javascript:alert(1)")).toBe(false);
    expect(isTrustedUrl("not-a-url")).toBe(false);
  });

  it("白名单本身不含通配陷阱", () => {
    expect(TRUSTED_DOMAINS.every((d) => d.domain.length > 3 && !d.domain.startsWith("."))).toBe(true);
  });
});

describe("去重与过滤", () => {
  it("规范化 URL 后去重(去 utm、去尾斜杠、大小写)", () => {
    const out = dedupeAndFilter([
      src("https://www.who.int/a?utm_source=x&id=1"),
      src("https://www.who.int/a?utm_source=y&id=1", "dup"),
      src("https://www.who.int/a/", "dup2"),
      src("https://www.cdc.gov/b"),
      src("https://spam.example.com/c"),
    ]);
    expect(out.map((o) => o.url)).toEqual(["https://www.who.int/a?utm_source=x&id=1", "https://www.cdc.gov/b"]);
  });
});

describe("searchSources", () => {
  it("无 API Key 时走内置知识库并命中缓存", async () => {
    delete process.env.TAVILY_API_KEY;
    const first = await searchSources("蛋白质 摄入 量", { noCache: true });
    expect(first.length).toBeGreaterThan(0);
    expect(first.every((r) => isTrustedUrl(r.url))).toBe(true);
    expect(first[0].accessedAt).toBeTruthy();

    const second = await searchSources("蛋白质 摄入 量"); // 应命中缓存,不再计算
    expect(second).toEqual(first);
  });

  it("配置 TAVILY_API_KEY 时使用可注入的 fetcher 并过滤白名单外结果", async () => {
    process.env.TAVILY_API_KEY = "test-key";
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          results: [
            { title: "WHO 健康饮食", url: "https://www.who.int/diet", content: "健康饮食要点" },
            { title: "垃圾站", url: "https://spam.example.com/x", content: "广告" },
            { title: "WHO 健康饮食(dup)", url: "https://www.who.int/diet", content: "重复" },
          ],
        }),
        { status: 200 }
      )
    );
    const out = await searchSources("饮食", { fetcher: fetcher as unknown as typeof fetch, noCache: true, limit: 5 });
    expect(fetcher).toHaveBeenCalledOnce();
    expect(out.map((o) => o.url)).toEqual(["https://www.who.int/diet"]);
    expect(out[0].title).toBe("WHO 健康饮食");
    delete process.env.TAVILY_API_KEY;
  });

  it("空查询返回空数组", async () => {
    expect(await searchSources("   ")).toEqual([]);
  });
});
