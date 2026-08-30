// 联网资料检索服务:可信域名白名单 + 去重 + 内存缓存
// - 配置 TAVILY_API_KEY 时走真实联网搜索(仅白名单域名)
// - 未配置时降级为内置「可信来源知识库」(人工整理的权威机构页面),保证离线可用
//
// 注意:搜索结果仅供学习参考,不构成医疗建议;涉及疾病、孕期、未成年人或
// 饮食障碍时,请咨询医生或注册营养师。

import type { SourceRef } from "@/types";

interface WhitelistEntry {
  domain: string;
  label: string;
}

export const TRUSTED_DOMAINS: WhitelistEntry[] = [
  { domain: "who.int", label: "世界卫生组织 (WHO)" },
  { domain: "acsm.org", label: "美国运动医学会 (ACSM)" },
  { domain: "cdc.gov", label: "美国疾病控制与预防中心 (CDC)" },
  { domain: "nih.gov", label: "美国国立卫生研究院 (NIH)" },
  { domain: "nutrition.org", label: "美国营养学会 (ASN)" },
  { domain: "efsa.europa.eu", label: "欧洲食品安全局 (EFSA)" },
  { domain: "nhs.uk", label: "英国国家医疗服务体系 (NHS)" },
  { domain: "usda.gov", label: "美国农业部 (USDA)" },
  { domain: "cnsoc.org", label: "中国营养学会" },
  { domain: "nhc.gov.cn", label: "国家卫生健康委员会" },
];

/** URL 是否属于可信域名 */
export function isTrustedUrl(rawUrl: string): boolean {
  try {
    const u = new URL(rawUrl);
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    const host = u.hostname.toLowerCase();
    return TRUSTED_DOMAINS.some((d) => host === d.domain || host.endsWith("." + d.domain));
  } catch {
    return false;
  }
}

function normalizeUrl(rawUrl: string): string {
  try {
    const u = new URL(rawUrl);
    u.hash = "";
    for (const key of [...u.searchParams.keys()]) {
      if (key.toLowerCase().startsWith("utm_") || key === "ref" || key === "source") u.searchParams.delete(key);
    }
    return `${u.hostname.toLowerCase()}${u.pathname.replace(/\/+$/, "")}`;
  } catch {
    return rawUrl;
  }
}

/** 按 规范化URL 去重,并过滤白名单外域名 */
export function dedupeAndFilter(items: SourceRef[]): SourceRef[] {
  const seen = new Set<string>();
  const out: SourceRef[] = [];
  for (const item of items) {
    if (!isTrustedUrl(item.url)) continue;
    const key = normalizeUrl(item.url);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

// ---------------- 内置知识库(离线降级) ----------------

export type CuratedSource = Omit<SourceRef, "accessedAt"> & { keywords: string[]; accessedAt?: string };

export const CURATED_SOURCES: CuratedSource[] = [
  {
    title: "WHO | 身体活动(Physical activity)事实档案",
    url: "https://www.who.int/news-room/fact-sheets/detail/physical-activity",
    source: "世界卫生组织 (WHO)",
    summary: "成人每周应进行 150-300 分钟中等强度有氧活动,并每周至少 2 天肌肉强化训练。",
    keywords: ["有氧", "运动", "身体活动", "训练", "力量", "指南", "exercise", "cardio"],
  },
  {
    title: "WHO | 健康饮食(Healthy diet)事实档案",
    url: "https://www.who.int/news-room/fact-sheets/detail/healthy-diet",
    source: "世界卫生组织 (WHO)",
    summary: "健康饮食建议:蔬果≥400g/天,游离糖<10%总能量,脂肪<30%总能量,控盐。",
    keywords: ["饮食", "营养", "健康", "膳食", "diet", "nutrition"],
  },
  {
    title: "CDC | 健康体重:关于减重(Healthy weight)",
    url: "https://www.cdc.gov/healthy-weight-growth/about/index.html",
    source: "美国疾控中心 (CDC)",
    summary: "可持续减重建议每周 0.25-1kg;通过饮食+运动制造温和热量缺口。",
    keywords: ["减重", "减脂", "热量", "缺口", "weight loss", "calorie"],
  },
  {
    title: "NIH | 膳食补充剂办公室:事实档案一览",
    url: "https://ods.od.nih.gov/factsheets/list-all/",
    source: "美国国立卫生研究院 (NIH)",
    summary: "蛋白质、维生素 D、钙等营养素权威摄入参考与安全性说明。",
    keywords: ["蛋白质", "补剂", "维生素", "蛋白", "protein", "supplement"],
  },
  {
    title: "ACSM | 运动测试与处方指南资源",
    url: "https://www.acsm.org/education-resources/trending-topics-resources/physical-activity-guidelines",
    source: "美国运动医学会 (ACSM)",
    summary: "抗阻训练建议:每个大肌群每周 2-3 次,8-12 次/组,组间休息 2-3 分钟。",
    keywords: ["力量", "抗阻", "组数", "次数", "休息", "resistance", "training", "sets"],
  },
  {
    title: "USDA | FoodData Central 食物营养数据库",
    url: "https://fdc.nal.usda.gov/",
    source: "美国农业部 (USDA)",
    summary: "查询食物热量与宏量营养素的权威数据库(英文)。",
    keywords: ["食物", "热量", "数据库", "food", "database", "kcal"],
  },
  {
    title: "中国营养学会 | 中国居民膳食指南",
    url: "http://dg.cnsoc.org/",
    source: "中国营养学会",
    summary: "平衡膳食准则:食物多样、少油少盐少糖、规律进餐、足量饮水。",
    keywords: ["膳食指南", "中国", "饮食", "营养", "diet", "china"],
  },
  {
    title: "NHS | 12周减重计划(Weight loss plan)",
    url: "https://www.nhs.uk/live-well/healthy-weight/start-the-nhs-weight-loss-plan/",
    source: "英国国家医疗服务体系 (NHS)",
    summary: "结构化 12 周计划:每周减 0.5-1kg,记录饮食与运动,建立长期习惯。",
    keywords: ["计划", "周期", "减重", "打卡", "plan", "12 week"],
  },
  {
    title: "EFSA | 膳食参考值(Dietary reference values)",
    url: "https://www.efsa.europa.eu/en/topics/topic/dietary-reference-values",
    source: "欧洲食品安全局 (EFSA)",
    summary: "宏量营养素供能比、纤维与水分的欧洲参考值。",
    keywords: ["宏量", "碳水", "脂肪", "供能", "macros", "efsa"],
  },
  {
    title: "WHO | 肥胖与健康(Obesity)",
    url: "https://www.who.int/health-topics/obesity",
    source: "世界卫生组织 (WHO)",
    summary: "BMI 分类与超重/肥胖的健康风险概述。",
    keywords: ["bmi", "肥胖", "体重", "体脂", "obesity"],
  },
];

function matchCurated(query: string, limit: number): SourceRef[] {
  const q = query.toLowerCase();
  const scored = CURATED_SOURCES.map((s) => {
    const hay = `${s.title} ${s.summary} ${s.keywords.join(" ")}`.toLowerCase();
    let score = 0;
    for (const token of q.split(/\s+/).filter(Boolean)) {
      if (hay.includes(token)) score += 2;
    }
    for (const kw of s.keywords) {
      if (q.includes(kw.toLowerCase())) score += 3;
    }
    return { s, score };
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
  const picked: SourceRef[] = scored.map((x) => ({ ...x.s, accessedAt: x.s.accessedAt ?? new Date().toISOString() }));
  // 检索不出时返回默认权威来源,保证页面始终有参考
  return picked.length > 0 ? picked : CURATED_SOURCES.slice(0, 3).map((s) => ({ ...s, accessedAt: s.accessedAt ?? new Date().toISOString() }));
}

// ---------------- 联网搜索(Tavily,可选) ----------------

async function tavilySearch(query: string, limit: number, fetcher: typeof fetch): Promise<SourceRef[]> {
  const key = process.env.TAVILY_API_KEY;
  if (!key) return [];
  const res = await fetcher("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: key,
      query,
      include_domains: TRUSTED_DOMAINS.map((d) => d.domain),
      max_results: limit,
      search_depth: "basic",
    }),
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) throw new Error(`tavily ${res.status}`);
  const json = (await res.json()) as { results?: { title: string; url: string; content: string }[] };
  const label = (url: string) => TRUSTED_DOMAINS.find((d) => new URL(url).hostname.endsWith(d.domain))?.label ?? "可信来源";
  return (json.results ?? []).map((r) => ({
    title: r.title,
    url: r.url,
    source: label(r.url),
    summary: (r.content ?? "").slice(0, 160),
    accessedAt: new Date().toISOString(),
  }));
}

// ---------------- 缓存与导出 ----------------

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 小时
const cache = new Map<string, { at: number; items: SourceRef[] }>();

export interface SearchOptions {
  limit?: number;
  fetcher?: typeof fetch;
  noCache?: boolean;
}

export async function searchSources(query: string, opts: SearchOptions = {}): Promise<SourceRef[]> {
  const q = query.trim().slice(0, 120);
  const limit = opts.limit ?? 6;
  if (!q) return [];

  const cached = cache.get(q);
  if (!opts.noCache && cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.items.slice(0, limit);
  }

  let items: SourceRef[] = [];
  if (process.env.TAVILY_API_KEY) {
    try {
      items = await tavilySearch(q, limit + 4, opts.fetcher ?? fetch);
    } catch (e) {
      console.warn("[search] tavily failed, fallback to curated:", e);
    }
  }
  if (items.length === 0) {
    items = matchCurated(q, limit + 2);
  }

  const finalItems = dedupeAndFilter(items)
    .slice(0, limit)
    .map((i) => ({ ...i, accessedAt: i.accessedAt ?? new Date().toISOString() }));

  cache.set(q, { at: Date.now(), items: finalItems });
  return finalItems;
}

export function clearSearchCache(): void {
  cache.clear();
}

/** 为生成的计划附加默认参考来源 */
export function planSources(): SourceRef[] {
  return matchCurated("力量训练 抗阻 有氧 身体活动 指南", 3).map((s) => ({
    ...s,
    accessedAt: new Date().toISOString(),
  }));
}

export function mealSources(): SourceRef[] {
  return matchCurated("健康饮食 膳食指南 蛋白质 热量", 3).map((s) => ({
    ...s,
    accessedAt: new Date().toISOString(),
  }));
}
