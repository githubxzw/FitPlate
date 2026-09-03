// 日期与通用工具:所有日期统一按 UTC 存储/比较,避免时区偏移问题

// 餐次与目标标签(运行时常量,定义在 types.ts,这里 re-export 便于客户端引用)
export { MEAL_SLOT_LABEL, GOAL_LABEL, GOAL_MEAL_LABEL, GOAL_HINT } from "@/types";

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/** Date -> YYYY-MM-DD(按 UTC) */
export function dateKey(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** YYYY-MM-DD -> Date(UTC 零点) */
export function parseDateKey(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
}

export function addDays(d: Date, days: number): Date {
  const nd = new Date(d.getTime());
  nd.setUTCDate(nd.getUTCDate() + days);
  return nd;
}

/** 今天的日期 key(按本地时区的自然日,再转 UTC 零点存储) */
export function todayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate()
  ).padStart(2, "0")}`;
}

const WEEKDAYS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

export function weekdayLabel(dateKeyStr: string): string {
  return WEEKDAYS[parseDateKey(dateKeyStr).getUTCDay()];
}

/** 8月30日 */
export function shortDate(dateKeyStr: string): string {
  const d = parseDateKey(dateKeyStr);
  return `${d.getUTCMonth() + 1}月${d.getUTCDate()}日`;
}

export function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "夜深了";
  if (h < 11) return "早上好";
  if (h < 14) return "中午好";
  if (h < 18) return "下午好";
  return "晚上好";
}

/** 稳定字符串 hash(用于生成种子/占位图色相) */
export function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function round5(n: number): number {
  return Math.round(n / 5) * 5;
}

export const INTENSITY_LABEL: Record<string, string> = {
  light: "减量",
  standard: "标准",
  plus: "加强",
};

/** Prisma Json 字段读取时的安全断言(JsonValue → 业务类型) */
export function fromJson<T>(value: unknown): T {
  return value as T;
}

export const DIFFICULTY_LABEL: Record<number, string> = {
  1: "简单",
  2: "中等",
  3: "进阶",
};
