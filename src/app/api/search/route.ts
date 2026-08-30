import { handle, ok, requireUserId } from "@/lib/api";
import { searchSources } from "@/lib/search";
import { rateLimit } from "@/lib/rate-limit";
import { tooMany } from "@/lib/api";

/** GET /api/search?q=... → 可信来源检索(白名单域名,去重+缓存),含访问日期。需登录。 */
export const GET = handle(async (req: Request) => {
  const userId = await requireUserId();
  const rl = rateLimit(`search:${userId}`, 20, 60 * 60_000);
  if (!rl.ok) {
    return tooMany(rl.retryAfterSec, "检索过于频繁,请稍后再试(每小时 20 次)");
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  const results = await searchSources(q, { limit: 6 });
  return ok({
    query: q,
    disclaimer: "检索结果仅供学习参考,不构成医疗建议;引用内容版权归原作者所有。",
    results,
  });
});
