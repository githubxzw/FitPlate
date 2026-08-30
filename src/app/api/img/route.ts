import { placeholderSvg, pexelsPhotoUrl } from "@/lib/images";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { tooMany } from "@/lib/api";

/**
 * GET /api/img?seed=xx&emoji=🥗&label=鸡胸沙拉&q=chicken salad&fallback=1
 * - 配置 PEXELS_API_KEY 且提供 q 时,优先 302 到可商用真实照片;
 * - 其余情况返回本地 SVG 占位图(离线可用)。
 * 按 IP 限流,防止图片代理配额被恶意消耗。
 */
export async function GET(req: Request) {
  const rl = rateLimit(`img:${clientIp(req)}`, 300, 10 * 60_000);
  if (!rl.ok) {
    return tooMany(rl.retryAfterSec, "图片请求过于频繁,请稍后再试");
  }

  const { searchParams } = new URL(req.url);
  const seed = searchParams.get("seed") ?? "fitplate";
  const emoji = searchParams.get("emoji") ?? "🥗";
  const label = (searchParams.get("label") ?? "FitPlate").slice(0, 24);
  const fallback = searchParams.get("fallback") === "1";
  const q = searchParams.get("q");

  if (!fallback && q && process.env.PEXELS_API_KEY) {
    const url = await pexelsPhotoUrl(q, seed);
    if (url) return Response.redirect(url, 302);
  }

  const svg = placeholderSvg({ seed: seed + label, emoji, label });
  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
