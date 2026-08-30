import { handle, ok } from "@/lib/api";
import { searchSources } from "@/lib/search";

/** GET /api/search?q=... → 可信来源检索(白名单域名,去重+缓存),含访问日期 */
export const GET = handle(async (req: Request) => {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  const results = await searchSources(q, { limit: 6 });
  return ok({
    query: q,
    disclaimer: "检索结果仅供学习参考,不构成医疗建议;引用内容版权归原作者所有。",
    results,
  });
});
