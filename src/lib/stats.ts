// 统计与激励计算(纯函数,可测试)
// 设计参考:
// - MacroFactor:体重趋势用指数移动平均(EMA)平滑,过滤每日称重噪声
// - Keep / Duolingo:连续达标天数(streak)与成就徽章体系
// - WaterMinder:饮水目标按体重估算(约 35ml/kg)

import { addDays, dateKey, parseDateKey } from "./utils";

export interface DayAdherence {
  date: string; // YYYY-MM-DD
  workoutDone: boolean;
  mealSlotsDone: number; // 0-4
}

/** 单日达标:完成训练,或四餐中完成 ≥3 餐(休息日可通过饮食达标) */
export function isDayDone(d: DayAdherence): boolean {
  return d.workoutDone || d.mealSlotsDone >= 3;
}

/** 单日完成度 0-100(训练 + 4 餐 共 5 项) */
export function dayScore(d: DayAdherence): number {
  const done = (d.workoutDone ? 1 : 0) + d.mealSlotsDone;
  return Math.round((done / 5) * 100);
}

/**
 * 当前连续达标天数:
 * - 今天未达标不断签(当日尚未结束),从昨天开始回溯
 * - 中断超过一天的缺口视为断签
 */
export function computeStreak(days: DayAdherence[], today: string): number {
  const map = new Map(days.map((d) => [d.date, d]));
  let streak = 0;
  const todayEntry = map.get(today);
  if (todayEntry && isDayDone(todayEntry)) streak++;
  let cursor = addDays(parseDateKey(today), -1);
  for (let i = 0; i < 400; i++) {
    const e = map.get(dateKey(cursor));
    if (!e || !isDayDone(e)) break;
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/** 历史最佳连续达标天数 */
export function bestStreak(days: DayAdherence[]): number {
  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
  let best = 0;
  let cur = 0;
  let prev: string | null = null;
  for (const d of sorted) {
    if (!isDayDone(d)) {
      cur = 0;
      prev = d.date;
      continue;
    }
    const gapDays = prev ? (parseDateKey(d.date).getTime() - parseDateKey(prev).getTime()) / 86400000 : Infinity;
    cur = gapDays === 1 ? cur + 1 : 1;
    best = Math.max(best, cur);
    prev = d.date;
  }
  return best;
}

/** 最近 n 天逐日完成度(含无记录日,用于热力图) */
export function heatmapData(days: DayAdherence[], today: string, n = 30): (DayAdherence & { score: number })[] {
  const map = new Map(days.map((d) => [d.date, d]));
  return Array.from({ length: n }, (_, i) => {
    const key = dateKey(addDays(parseDateKey(today), -(n - 1 - i)));
    const e = map.get(key) ?? { date: key, workoutDone: false, mealSlotsDone: 0 };
    return { ...e, score: dayScore(e) };
  });
}

/** 周完成率(近 n 周,含本周;每周为周一到周日) */
export function weeklyAdherence(days: DayAdherence[], today: string, weeks = 8): { weekStart: string; pct: number }[] {
  const map = new Map(days.map((d) => [d.date, d]));
  const todayDate = parseDateKey(today);
  // 本周一
  const mondayOffset = (todayDate.getUTCDay() + 6) % 7;
  const thisMonday = addDays(todayDate, -mondayOffset);
  return Array.from({ length: weeks }, (_, i) => {
    const start = addDays(thisMonday, -(weeks - 1 - i) * 7);
    let done = 0;
    let total = 0;
    for (let j = 0; j < 7; j++) {
      const key = dateKey(addDays(start, j));
      if (key > today) break; // 未来日期不计入
      const e = map.get(key);
      if (!e) continue; // 无计划日不计入
      total++;
      if (isDayDone(e)) done++;
    }
    return { weekStart: dateKey(start), pct: total === 0 ? 0 : Math.round((done / total) * 100) };
  });
}

export interface WeightPoint {
  date: string;
  weightKg: number;
}

/** 趋势体重:7 日 EMA(α = 2/8),MacroFactor 式平滑 */
export function trendWeight(series: WeightPoint[]): { date: string; weight: number; trend: number }[] {
  const sorted = [...series]
    .filter((s) => Number.isFinite(s.weightKg) && s.weightKg > 0)
    .sort((a, b) => a.date.localeCompare(b.date));
  const alpha = 2 / (7 + 1);
  let trend: number | null = null;
  return sorted.map((p) => {
    trend = trend === null ? p.weightKg : trend + alpha * (p.weightKg - trend);
    return { date: p.date, weight: p.weightKg, trend: Math.round(trend * 10) / 10 };
  });
}

/** 每日饮水目标(ml):35ml/kg,就近取整到 50 */
export function waterGoalMl(weightKg: number): number {
  return Math.round((weightKg * 35) / 50) * 50;
}

export interface BadgeInput {
  streak: number;
  totalWorkouts: number; // 累计训练打卡次数
  mealCheckinDays: number; // 有任意餐打卡的天数
  weightLogDays: number; // 体重记录天数
  waterGoalDays: number; // 饮水达标天数
  startWeightKg: number; // 档案起始体重
  currentWeightKg: number | null; // 最新记录体重
  goalWeightKg: number;
}

export interface BadgeDef {
  id: string;
  emoji: string;
  name: string;
  desc: string;
  unlocked: boolean;
  /** 0-100,未解锁时展示进度 */
  progress: number;
}

function lvl(value: number, target: number): number {
  return Math.min(100, Math.floor((value / target) * 100));
}

/** 成就徽章:按激励体系分层(起步 → 坚持 → 里程碑 → 目标达成) */
export function computeBadges(input: BadgeInput): BadgeDef[] {
  const anyCheckin = input.totalWorkouts + input.mealCheckinDays;
  const lossKg =
    input.currentWeightKg !== null && input.startWeightKg > input.goalWeightKg
      ? input.startWeightKg - input.currentWeightKg
      : 0;
  const goalReached =
    input.currentWeightKg !== null &&
    ((input.startWeightKg > input.goalWeightKg && input.currentWeightKg <= input.goalWeightKg) ||
      (input.startWeightKg < input.goalWeightKg && input.currentWeightKg >= input.goalWeightKg));

  return [
    { id: "first-checkin", emoji: "🎉", name: "迈出第一步", desc: "完成第一次打卡", unlocked: anyCheckin >= 1, progress: lvl(anyCheckin, 1) },
    { id: "streak-3", emoji: "🔥", name: "三日坚持", desc: "连续 3 天达标", unlocked: input.streak >= 3, progress: lvl(input.streak, 3) },
    { id: "streak-7", emoji: "⚡", name: "七日连胜", desc: "连续 7 天达标", unlocked: input.streak >= 7, progress: lvl(input.streak, 7) },
    { id: "streak-21", emoji: "🌟", name: "习惯成型", desc: "连续 21 天达标", unlocked: input.streak >= 21, progress: lvl(input.streak, 21) },
    { id: "workouts-10", emoji: "💪", name: "十练之功", desc: "累计完成 10 次训练", unlocked: input.totalWorkouts >= 10, progress: lvl(input.totalWorkouts, 10) },
    { id: "workouts-50", emoji: "🏋️", name: "半百铁人", desc: "累计完成 50 次训练", unlocked: input.totalWorkouts >= 50, progress: lvl(input.totalWorkouts, 50) },
    { id: "meals-14", emoji: "🍽️", name: "知味两周", desc: "累计 14 天饮食打卡", unlocked: input.mealCheckinDays >= 14, progress: lvl(input.mealCheckinDays, 14) },
    { id: "weight-log", emoji: "⚖️", name: "称重起步", desc: "记录 3 天体重", unlocked: input.weightLogDays >= 3, progress: lvl(input.weightLogDays, 3) },
    { id: "water-7", emoji: "💧", name: "补水达人", desc: "累计 7 天饮水达标", unlocked: input.waterGoalDays >= 7, progress: lvl(input.waterGoalDays, 7) },
    { id: "goal-hit", emoji: "🎯", name: "目标达成", desc: "体重抵达目标", unlocked: goalReached, progress: lvl(lossKg, Math.max(0.1, input.startWeightKg - input.goalWeightKg)) },
  ];
}
