// 统计聚合服务(仅服务端):把打卡/日志数据聚合成 streak、徽章、趋势等

import { db } from "./db";
import {
  bestStreak,
  computeBadges,
  computeStreak,
  trendWeight,
  waterGoalMl,
  type BadgeDef,
  type DayAdherence,
} from "./stats";
import { addDays, dateKey, parseDateKey, todayKey } from "./utils";

export interface StatsSummary {
  today: string;
  streak: number;
  best: number;
  totalWorkouts: number;
  mealCheckinDays: number;
  weightLogDays: number;
  waterGoalDays: number;
  waterGoalMl: number;
  todayWaterMl: number;
  todayWeightKg: number | null;
  latestWeightKg: number | null;
  /** 旅程起点体重:最早一次记录,无记录则为档案当前体重 */
  firstWeightKg: number;
  badges: BadgeDef[];
  /** 逐日完成度(有计划/打卡的日期) */
  adherence: DayAdherence[];
  /** 体重记录 + EMA 趋势 */
  weightSeries: { date: string; weight: number; trend: number }[];
}

/** 拉取最近 days 天的打卡与日志并聚合成统计摘要 */
export async function getStatsSummary(
  userId: string,
  profile: { weightKg: number; goalWeightKg: number },
  days = 180
): Promise<StatsSummary> {
  const today = todayKey();
  const fromDate = addDays(parseDateKey(today), -days);

  const [planDays, mealDays, logs] = await Promise.all([
    db.planDay.findMany({
      where: { userId, date: { gte: fromDate } },
      select: { date: true, completed: true },
    }),
    db.mealDay.findMany({
      where: { userId, date: { gte: fromDate } },
      select: { date: true, completedSlots: true },
    }),
    db.dailyLog.findMany({
      where: { userId, date: { gte: fromDate } },
      orderBy: { date: "asc" },
    }),
  ]);

  const adherence = new Map<string, DayAdherence>();
  for (const p of planDays) {
    const key = dateKey(p.date);
    const e = adherence.get(key) ?? { date: key, workoutDone: false, mealSlotsDone: 0 };
    e.workoutDone = e.workoutDone || p.completed;
    adherence.set(key, e);
  }
  for (const m of mealDays) {
    const key = dateKey(m.date);
    const e = adherence.get(key) ?? { date: key, workoutDone: false, mealSlotsDone: 0 };
    e.mealSlotsDone = Math.max(e.mealSlotsDone, m.completedSlots.length);
    adherence.set(key, e);
  }

  const adherenceList = [...adherence.values()];
  const goalMl = waterGoalMl(profile.weightKg);

  const logPoints = logs.map((l) => ({
    date: dateKey(l.date),
    weightKg: l.weightKg,
    waterMl: l.waterMl,
  }));

  const totalWorkouts = planDays.filter((p) => p.completed).length;
  const mealCheckinDays = mealDays.filter((m) => m.completedSlots.length > 0).length;
  const weightLogDays = logPoints.filter((l) => l.weightKg !== null).length;
  const waterGoalDays = logPoints.filter((l) => l.waterMl >= goalMl).length;
  const currentWeightKg = [...logPoints].reverse().find((l) => l.weightKg !== null)?.weightKg ?? null;

  const streak = computeStreak(adherenceList, today);
  const badges = computeBadges({
    streak,
    totalWorkouts,
    mealCheckinDays,
    weightLogDays,
    waterGoalDays,
    startWeightKg: profile.weightKg,
    currentWeightKg,
    goalWeightKg: profile.goalWeightKg,
  });

  return {
    today,
    streak,
    best: bestStreak(adherenceList),
    totalWorkouts,
    mealCheckinDays,
    weightLogDays,
    waterGoalDays,
    waterGoalMl: goalMl,
    todayWaterMl: logPoints.find((l) => l.date === today)?.waterMl ?? 0,
    todayWeightKg: logPoints.find((l) => l.date === today)?.weightKg ?? null,
    latestWeightKg: currentWeightKg,
    firstWeightKg: logPoints.find((l) => l.weightKg !== null)?.weightKg ?? profile.weightKg,
    badges,
    adherence: adherenceList,
    weightSeries: trendWeight(
      logPoints.filter((l) => l.weightKg !== null).map((l) => ({ date: l.date, weightKg: l.weightKg! }))
    ),
  };
}
