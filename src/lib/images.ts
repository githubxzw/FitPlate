// 图片服务:
// - 默认生成本地 SVG 占位图(渐变 + emoji + 标签),零外部依赖、离线可用;
// - 配置 PEXELS_API_KEY 后优先返回可商用真实照片(Pexels API,302 跳转),
//   失败时自动降级为 SVG 占位图;调用方(SmartImage)onError 时同样降级。
// 版权说明见 README:「图片与版权」一节。

import { hashSeed } from "./utils";

const EMOJI_PALETTE: [string, string][] = [
  ["#d1fae5", "#6ee7b7"],
  ["#dbeafe", "#93c5fd"],
  ["#fef3c7", "#fcd34d"],
  ["#fce7f3", "#f9a8d4"],
  ["#e0e7ff", "#a5b4fc"],
  ["#dcfce7", "#86efac"],
  ["#ffedd5", "#fdba74"],
  ["#f3e8ff", "#d8b4fe"],
];

export function placeholderSvg(opts: { seed: string; emoji: string; label: string; w?: number; h?: number }): string {
  const w = opts.w ?? 800;
  const h = opts.h ?? 600;
  const h1 = hashSeed(opts.seed);
  const [c1, c2] = EMOJI_PALETTE[h1 % EMOJI_PALETTE.length];
  const angle = h1 % 360;
  const label = opts.label.slice(0, 24).replace(/[<>&"']/g, "");
  const emoji = opts.emoji.slice(0, 4);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${label}">
  <defs>
    <linearGradient id="g" gradientTransform="rotate(${angle} .5 .5)">
      <stop offset="0%" stop-color="${c1}"/>
      <stop offset="100%" stop-color="${c2}"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#g)"/>
  <circle cx="${w * 0.82}" cy="${h * 0.2}" r="${h * 0.28}" fill="#ffffff" opacity="0.25"/>
  <circle cx="${w * 0.12}" cy="${h * 0.85}" r="${h * 0.22}" fill="#ffffff" opacity="0.2"/>
  <text x="50%" y="44%" font-size="${h * 0.3}" text-anchor="middle" dominant-baseline="middle">${emoji}</text>
  <text x="50%" y="76%" font-size="${h * 0.07}" text-anchor="middle" fill="#0f172a" opacity="0.75" font-family="'PingFang SC','Microsoft YaHei',sans-serif" font-weight="600">${label}</text>
  <text x="50%" y="86%" font-size="${h * 0.032}" text-anchor="middle" fill="#0f172a" opacity="0.45" font-family="'PingFang SC','Microsoft YaHei',sans-serif">FitPlate 配图(占位)</text>
</svg>`;
}

// ---------------- Pexels(可选) ----------------

interface PexelsCacheEntry {
  at: number;
  url: string | null;
  photographer?: string;
}

const pexelsCache = new Map<string, PexelsCacheEntry>();
const PEXELS_TTL = 24 * 60 * 60 * 1000;

export async function pexelsPhotoUrl(query: string, seed: string, fetcher: typeof fetch = fetch): Promise<string | null> {
  const key = process.env.PEXELS_API_KEY;
  if (!key) return null;
  const cached = pexelsCache.get(query);
  if (cached && Date.now() - cached.at < PEXELS_TTL) return cached.url;

  let url: string | null = null;
  let photographer: string | undefined;
  try {
    const res = await fetcher(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=6&orientation=landscape`,
      { headers: { Authorization: key }, signal: AbortSignal.timeout(10000) }
    );
    if (res.ok) {
      const json = (await res.json()) as {
        photos?: { src?: { large?: string; medium?: string }; photographer?: string }[];
      };
      const photos = json.photos ?? [];
      const pick = photos[hashSeed(seed) % Math.max(1, photos.length)];
      if (pick) {
        url = pick.src?.large ?? pick.src?.medium ?? null;
        photographer = pick.photographer;
      }
    }
  } catch (e) {
    console.warn("[image] pexels failed, fallback to placeholder:", e);
  }
  pexelsCache.set(query, { at: Date.now(), url, photographer });
  return url;
}
