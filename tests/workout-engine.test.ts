import { describe, expect, it } from "vitest";
import { generatePlan, rescaleBlocks } from "@/lib/workout-engine";
import { EXERCISE_MAP } from "@/lib/exercises";
import type { ProfileInput, PlanBlocks } from "@/types";

const base: ProfileInput = {
  sex: "male",
  age: 28,
  heightCm: 175,
  weightKg: 78,
  bodyFatPct: null,
  goalWeightKg: 72,
  durationDays: 30,
  experience: "beginner",
  trainingDaysPerWeek: 3,
  place: "home",
  equipment: ["mat", "dumbbell", "band"],
  dietPrefs: [],
  allergies: [],
  disliked: [],
  budgetYuan: 40,
  cookMinutes: 30,
  flags: [],
};

const profiles: ProfileInput[] = [
  base,
  { ...base, experience: "intermediate", trainingDaysPerWeek: 4, place: "gym", equipment: ["barbell", "machine", "cardio_machine", "bench"] },
  { ...base, experience: "advanced", trainingDaysPerWeek: 5, equipment: ["mat"] },
];

describe("训练日历生成", () => {
  for (const duration of [7, 14, 30]) {
    it(`周期 ${duration} 天生成 ${duration} 天且日期连续`, () => {
      const days = generatePlan({ ...base, durationDays: duration }, "2026-09-01");
      expect(days).toHaveLength(duration);
      for (let i = 0; i < duration; i++) {
        expect(days[i].date).toBe(new Date(Date.UTC(2026, 8, 1 + i)).toISOString().slice(0, 10));
      }
    });
  }

  it("训练天数与每周可训练天数匹配(允许 ±1/周)", () => {
    for (const p of profiles) {
      const days = generatePlan(p, "2026-09-07"); // 周一开始
      const training = days.filter((d) => d.isTraining).length;
      const weeks = p.durationDays / 7;
      expect(training).toBeGreaterThanOrEqual(p.trainingDaysPerWeek * weeks - 1);
      expect(training).toBeLessThanOrEqual(p.trainingDaysPerWeek * weeks + 1);
    }
  });

  it("训练日包含热身/力量/有氧/拉伸,恢复日没有力量块", () => {
    const days = generatePlan(base, "2026-09-07");
    for (const d of days) {
      expect(d.blocks.warmup.length + d.blocks.cardio.length).toBeGreaterThan(0);
      if (d.isTraining) {
        expect(d.blocks.strength.length).toBeGreaterThan(0);
        expect(d.blocks.cardio.length).toBeGreaterThan(0);
        expect(d.blocks.stretch.length).toBeGreaterThan(0);
      } else {
        expect(d.blocks.strength).toHaveLength(0);
      }
    }
  });

  it("只使用用户可用器械的动作", () => {
    for (const p of profiles) {
      const days = generatePlan(p, "2026-09-07");
      for (const d of days) {
        const items = [...d.blocks.warmup, ...d.blocks.strength, ...d.blocks.cardio, ...d.blocks.stretch];
        for (const item of items) {
          const ex = EXERCISE_MAP[item.exerciseId];
          expect(ex).toBeDefined();
          const ok = ex.equipment.some((eq) => eq === "none" || p.equipment.includes(eq));
          expect(ok).toBe(true);
        }
      }
    }
  });

  it("强度档改变训练量:加强 ≥ 标准 ≥ 减量", () => {
    const days = generatePlan(base, "2026-09-07");
    const training = days.find((d) => d.isTraining)!;
    const volume = (b: PlanBlocks) =>
      b.strength.reduce((s, it) => s + (it.sets ?? 0) * (it.repsOrDuration ?? 0), 0) +
      b.cardio.reduce((s, c) => s + (c.repsOrDuration ?? 0), 0);
    const std = volume(training.blocks);
    const plus = volume(rescaleBlocks(training.blocks, "plus"));
    const light = volume(rescaleBlocks(training.blocks, "light"));
    expect(plus).toBeGreaterThanOrEqual(std);
    expect(light).toBeLessThan(std);
  });

  it("确定性:同一输入两次生成结果一致", () => {
    const a = generatePlan(base, "2026-09-07", 42);
    const b = generatePlan(base, "2026-09-07", 42);
    expect(a).toEqual(b);
  });
});
