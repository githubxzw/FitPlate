import { describe, expect, it } from "vitest";
import {
  bestStreak,
  computeBadges,
  computeStreak,
  dayScore,
  heatmapData,
  isDayDone,
  trendWeight,
  waterGoalMl,
  weeklyAdherence,
} from "@/lib/stats";
import type { DayAdherence, WeightPoint } from "@/lib/stats";

const TODAY = "2026-09-09";

function d(offsetDays: number, workout = true, meals = 4): DayAdherence {
  const base = new Date(Date.UTC(2026, 8, 9)); // 2026-09-09
  base.setUTCDate(base.getUTCDate() + offsetDays);
  return { date: base.toISOString().slice(0, 10), workoutDone: workout, mealSlotsDone: meals };
}

describe("单日达标与完成度", () => {
  it("完成训练即达标", () => {
    expect(isDayDone({ date: TODAY, workoutDone: true, mealSlotsDone: 0 })).toBe(true);
  });
  it("休息日完成 3 餐也算达标,2 餐不算", () => {
    expect(isDayDone({ date: TODAY, workoutDone: false, mealSlotsDone: 3 })).toBe(true);
    expect(isDayDone({ date: TODAY, workoutDone: false, mealSlotsDone: 2 })).toBe(false);
  });
  it("dayScore:训练+4餐=100,仅2餐=40", () => {
    expect(dayScore({ date: TODAY, workoutDone: true, mealSlotsDone: 4 })).toBe(100);
    expect(dayScore({ date: TODAY, workoutDone: false, mealSlotsDone: 2 })).toBe(40);
  });
});

describe("连续达标 streak", () => {
  it("今天未达标不断签,从昨天回溯", () => {
    const days = [d(-1), d(-2), d(-3)];
    expect(computeStreak(days, TODAY)).toBe(3);
  });
  it("今天已达标则计入", () => {
    const days = [d(0), d(-1), d(-2)];
    expect(computeStreak(days, TODAY)).toBe(3);
  });
  it("中断日截断", () => {
    const days = [d(0, false, 0), d(-1, false, 1), d(-2), d(-3)];
    expect(computeStreak(days, TODAY)).toBe(0);
  });
  it("空数据为 0", () => {
    expect(computeStreak([], TODAY)).toBe(0);
  });
  it("bestStreak 取历史最长(含已中断的连胜)", () => {
    const days = [
      d(-10),
      d(-9),
      d(-8),
      d(-7, false, 0), // 断
      d(-1), // 当前连胜 1 天
    ];
    expect(bestStreak(days)).toBe(3);
  });
});

describe("热力图与周完成率", () => {
  it("heatmapData 输出 n 天且无记录日 score=0", () => {
    const cells = heatmapData([d(0)], TODAY, 7);
    expect(cells).toHaveLength(7);
    expect(cells[6].date).toBe(TODAY);
    expect(cells[6].score).toBe(100);
    expect(cells[0].score).toBe(0);
  });
  it("weeklyAdherence 本周内只统计到今天,未来日不计", () => {
    const days = [d(0), d(-1), d(-2)];
    const weeks = weeklyAdherence(days, TODAY, 2);
    expect(weeks).toHaveLength(2);
    expect(weeks[1].pct).toBe(100);
  });
});

describe("趋势体重 EMA", () => {
  it("首点 trend = 首次体重", () => {
    const out = trendWeight([
      { date: "2026-09-01", weightKg: 80 },
      { date: "2026-09-02", weightKg: 79 },
    ]);
    expect(out[0].trend).toBe(80);
  });
  it("第二点按 α=0.25 平滑", () => {
    const out = trendWeight([
      { date: "2026-09-01", weightKg: 80 },
      { date: "2026-09-02", weightKg: 76 },
    ]);
    expect(out[1].trend).toBe(79); // 80 + 0.25*(76-80)
  });
  it("过滤无效数据并按日期排序", () => {
    const out = trendWeight([
      { date: "2026-09-03", weightKg: 78 },
      { date: "2026-09-02", weightKg: 0 },
      { date: "2026-09-01", weightKg: NaN },
      { date: "2026-09-02", weightKg: 80 },
    ]);
    expect(out).toHaveLength(2);
    expect(out[0].date).toBe("2026-09-02");
  });
});

describe("饮水目标", () => {
  it("35ml/kg,就近取整到 50ml", () => {
    expect(waterGoalMl(70)).toBe(2450);
    expect(waterGoalMl(60)).toBe(2100);
    expect(waterGoalMl(80)).toBe(2800);
  });
});

describe("成就徽章", () => {
  const base = {
    streak: 0,
    totalWorkouts: 0,
    mealCheckinDays: 0,
    weightLogDays: 0,
    waterGoalDays: 0,
    startWeightKg: 80,
    currentWeightKg: null as number | null,
    goalWeightKg: 72,
  };

  it("全零只有未解锁徽章", () => {
    const badges = computeBadges(base);
    expect(badges.every((b) => !b.unlocked)).toBe(true);
  });

  it("首次打卡解锁,progress 满格", () => {
    const badges = computeBadges({ ...base, totalWorkouts: 1 });
    const first = badges.find((b) => b.id === "first-checkin")!;
    expect(first.unlocked).toBe(true);
    expect(first.progress).toBe(100);
  });

  it("streak 进度正确且不超 100", () => {
    const badges = computeBadges({ ...base, streak: 10 });
    const s7 = badges.find((b) => b.id === "streak-7")!;
    const s21 = badges.find((b) => b.id === "streak-21")!;
    expect(s7.unlocked).toBe(true);
    expect(s21.progress).toBe(Math.floor((10 / 21) * 100));
  });

  it("体重达到目标解锁 goal-hit", () => {
    const badges = computeBadges({ ...base, currentWeightKg: 71.8 });
    expect(badges.find((b) => b.id === "goal-hit")!.unlocked).toBe(true);
  });

  it("增重目标的 goal-hit(目标高于起始)", () => {
    const badges = computeBadges({ ...base, startWeightKg: 50, goalWeightKg: 55, currentWeightKg: 55.2 });
    expect(badges.find((b) => b.id === "goal-hit")!.unlocked).toBe(true);
  });
});
