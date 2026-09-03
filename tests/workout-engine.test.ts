import { describe, expect, it } from "vitest";
import { generatePlan, rescaleBlocks } from "@/lib/workout-engine";
import { EXERCISE_MAP } from "@/lib/exercises";
import type { ProfileInput, PlanBlocks, WeekDayDef } from "@/types";

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

describe("增肌(bulk)训练倾斜", () => {
  const gym: ProfileInput = {
    ...base,
    experience: "intermediate",
    trainingDaysPerWeek: 4,
    place: "gym",
    equipment: ["mat", "dumbbell", "bench", "barbell", "machine", "cable", "cardio_machine"],
  };

  it("力量动作组数不少于减脂模式,且次数落在肌肥大区间", () => {
    const cut = generatePlan({ ...gym, goal: "cut" }, "2026-09-07", 7);
    const bulk = generatePlan({ ...gym, goal: "bulk" }, "2026-09-07", 7);
    const totalSets = (days: ReturnType<typeof generatePlan>) =>
      days.filter((d) => d.isTraining).reduce((s, d) => s + d.blocks.strength.reduce((x, it) => x + (it.sets ?? 0), 0), 0);
    expect(totalSets(bulk)).toBeGreaterThan(totalSets(cut));

    for (const d of bulk.filter((x) => x.isTraining)) {
      for (const it of d.blocks.strength) {
        if (it.unit === "reps") expect(it.repsOrDuration).toBeGreaterThanOrEqual(8);
        if (it.unit === "reps") expect(it.repsOrDuration).toBeLessThanOrEqual(12);
      }
    }
  });

  it("力量动作组间休息不小于 90 秒", () => {
    const bulk = generatePlan({ ...gym, goal: "bulk" }, "2026-09-07", 7);
    for (const d of bulk.filter((x) => x.isTraining)) {
      for (const it of d.blocks.strength) {
        if (it.unit === "reps") expect(it.restSec ?? 90).toBeGreaterThanOrEqual(90);
      }
    }
  });

  it("有氧仍保留但时长不超过 20 分钟", () => {
    const bulk = generatePlan({ ...gym, goal: "bulk" }, "2026-09-07", 7);
    const training = bulk.filter((d) => d.isTraining);
    expect(training.length).toBeGreaterThan(0);
    for (const d of training) {
      expect(d.blocks.cardio.length).toBeGreaterThan(0);
      for (const c of d.blocks.cardio) expect(c.repsOrDuration ?? 0).toBeLessThanOrEqual(20);
    }
  });

  it("增肌日力量动作数量不少于减脂日(额外孤立动作槽生效)", () => {
    const cut = generatePlan({ ...gym, goal: "cut" }, "2026-09-07", 3);
    const bulk = generatePlan({ ...gym, goal: "bulk" }, "2026-09-07", 3);
    const count = (days: ReturnType<typeof generatePlan>) =>
      days.filter((d) => d.isTraining).map((d) => d.blocks.strength.length);
    const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
    expect(sum(count(bulk))).toBeGreaterThanOrEqual(sum(count(cut)));
  });
});

describe("自定义周模板", () => {
  const customBlocks: PlanBlocks = {
    warmup: [{ exerciseId: "w-jumping-jack", name: "开合跳", emoji: "🤸", kind: "warmup", unit: "seconds", sets: 2, repsOrDuration: 40, tips: [] }],
    strength: [
      { exerciseId: "s-bb-bench-press", name: "杠铃卧推", emoji: "🏋️", kind: "strength", unit: "reps", sets: 5, repsOrDuration: 5, restSec: 150, tips: [] },
      { exerciseId: "s-db-curl", name: "哑铃弯举", emoji: "💪", kind: "strength", unit: "reps", sets: 3, repsOrDuration: 12, restSec: 60, tips: [] },
    ],
    cardio: [],
    stretch: [{ exerciseId: "x-shoulder", name: "肩背拉伸", emoji: "🤲", kind: "stretch", unit: "seconds", sets: 1, repsOrDuration: 40, tips: [] }],
  };

  const week: WeekDayDef[] = [
    { type: "custom", focus: "卧推日", blocks: customBlocks },
    { type: "rest" },
    { type: "template", templateId: "legs" },
    { type: "rest" },
    { type: "template", templateId: "pull" },
    { type: "custom", focus: "手臂强化", blocks: { ...customBlocks, strength: customBlocks.strength.slice(1) } },
    { type: "rest" },
  ];

  const gym: ProfileInput = {
    ...base,
    place: "gym",
    equipment: ["mat", "dumbbell", "bench", "barbell", "machine", "cable", "cardio_machine"],
  };

  it("未启用时忽略自定义模板,仍走内置周计划", () => {
    const days = generatePlan({ ...gym, customWeek: week, customWeekEnabled: false }, "2026-09-07", 5);
    // beginner-3 内置排布:周一/周三/周五训练 → 周二应为休息
    expect(days[1].date).toBe("2026-09-08");
    expect(days[1].isTraining).toBe(false);
  });

  it("启用后按 7 天模板轮转,休息日与模板日正确排布", () => {
    const days = generatePlan({ ...gym, customWeek: week, customWeekEnabled: true, durationDays: 14 }, "2026-09-07", 5);
    expect(days).toHaveLength(14);
    expect(days[0].isTraining).toBe(true); // 周一 custom
    expect(days[0].focus).toBe("卧推日");
    expect(days[1].isTraining).toBe(false); // 周二 rest
    expect(days[2].isTraining).toBe(true); // 周三 template legs
    expect(days[7].focus).toBe("卧推日"); // 下周一复用同一天定义
    expect(days[8].isTraining).toBe(false);
  });

  it("custom 日原样采用用户动作清单(不被模板覆盖、不被缩放)", () => {
    const days = generatePlan({ ...gym, customWeek: week, customWeekEnabled: true }, "2026-09-07", 5);
    const mon = days[0];
    expect(mon.blocks.strength).toEqual(customBlocks.strength);
    expect(mon.blocks.strength[0].sets).toBe(5);
    expect(mon.blocks.strength[0].repsOrDuration).toBe(5);
    expect(mon.blocks.cardio).toHaveLength(0);
    expect(mon.durationMin).toBeGreaterThan(0);
  });

  it("template 日按模板生成并尊重用户器械", () => {
    const days = generatePlan({ ...gym, customWeek: week, customWeekEnabled: true }, "2026-09-07", 5);
    const wed = days[2];
    expect(wed.blocks.strength.length).toBeGreaterThan(0);
    expect(wed.blocks.warmup.length).toBeGreaterThan(0);
    for (const it of [...wed.blocks.strength, ...wed.blocks.warmup]) {
      const ex = EXERCISE_MAP[it.exerciseId];
      expect(ex.equipment.some((eq) => eq === "none" || gym.equipment.includes(eq))).toBe(true);
    }
  });

  it("rest 日生成恢复安排(散步+拉伸,无力量)", () => {
    const days = generatePlan({ ...gym, customWeek: week, customWeekEnabled: true }, "2026-09-07", 5);
    const tue = days[1];
    expect(tue.isTraining).toBe(false);
    expect(tue.blocks.strength).toHaveLength(0);
    expect(tue.blocks.cardio.length).toBeGreaterThan(0);
  });

  it("模板长度不足 7 时安全回退到内置周计划", () => {
    const days = generatePlan({ ...gym, customWeek: week.slice(0, 3), customWeekEnabled: true }, "2026-09-07", 5);
    expect(days).toHaveLength(30);
    expect(days[0].focus).not.toBe("卧推日");
  });
});
