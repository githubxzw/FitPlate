import { placeholderSvg, pexelsPhotoUrl } from "@/lib/images";

/**
 * GET /api/img?seed=xx&emoji=🥗&label=鸡胸沙拉&q=chicken salad&fallback=1
 * - 配置 PEXELS_API_KEY 且提供 q 时,优先 302 到可商用真实照片;
 * - 其余情况返回本地 SVG 占位图(离线可用)。
 */
export async function GET(req: Request) {
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
