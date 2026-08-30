import { describe, expect, it } from "vitest";
import { activityFactor, calcBMR, deriveTargets, slotKcal, SLOT_SHARE } from "@/lib/calc";
import type { ProfileInput } from "@/types";

const male: ProfileInput = {
  sex: "male",
  age: 30,
  heightCm: 180,
  weightKg: 80,
  bodyFatPct: null,
  goalWeightKg: 72,
  durationDays: 30,
  experience: "intermediate",
  trainingDaysPerWeek: 4,
  place: "home",
  equipment: ["mat", "dumbbell"],
  dietPrefs: [],
  allergies: [],
  disliked: [],
  budgetYuan: 40,
  cookMinutes: 30,
  flags: [],
};

describe("BMR 计算", () => {
  it("Mifflin-St Jeor:男 30y 180cm 80kg ≈ 1780 kcal", () => {
    expect(Math.round(calcBMR({ sex: "male", age: 30, heightCm: 180, weightKg: 80, bodyFatPct: null }))).toBe(1780);
  });

  it("女性公式偏低 166 kcal", () => {
    const female = calcBMR({ sex: "female", age: 30, heightCm: 180, weightKg: 80, bodyFatPct: null });
    const maleBmr = calcBMR({ sex: "male", age: 30, heightCm: 180, weightKg: 80, bodyFatPct: null });
    expect(Math.round(maleBmr - female)).toBe(166);
  });

  it("提供体脂率时使用 Katch-McArdle", () => {
    const bmr = calcBMR({ sex: "male", age: 30, heightCm: 180, weightKg: 80, bodyFatPct: 20 });
    const lbm = 80 * 0.8;
    expect(Math.round(bmr)).toBe(Math.round(370 + 21.6 * lbm));
  });
});

describe("活动系数与目标推导", () => {
  it("活动系数单调", () => {
    expect(activityFactor(0)).toBeLessThan(activityFactor(3));
    expect(activityFactor(3)).toBeLessThan(activityFactor(7));
  });

  it("减重目标产生热量缺口,且不越过安全下限", () => {
    const t = deriveTargets(male);
    expect(t.deficitKcal).toBeLessThan(0);
    expect(t.targetKcal).toBeGreaterThanOrEqual(1500);
    expect(t.targetKcal).toBeLessThan(t.tdee);
  });

  it("缺口上限为 TDEE 的 25%", () => {
    const aggressive: ProfileInput = { ...male, weightKg: 130, goalWeightKg: 70, durationDays: 30 };
    const t = deriveTargets(aggressive);
    expect(-t.deficitKcal).toBeLessThanOrEqual(Math.round(t.tdee * 0.25) + 1);
  });

  it("女性摄入不低于 1200 kcal", () => {
    const t = deriveTargets({ ...male, sex: "female", weightKg: 55, goalWeightKg: 45, heightCm: 158, durationDays: 7 });
    expect(t.targetKcal).toBeGreaterThanOrEqual(1200);
  });

  it("BMI 偏低时按维持热量处理", () => {
    const thin: ProfileInput = { ...male, weightKg: 55, goalWeightKg: 50, heightCm: 180 };
    const t = deriveTargets(thin);
    expect(t.deficitKcal).toBe(0);
    expect(t.targetKcal).toBe(t.tdee);
    expect(t.warnings.join("")).toContain("BMI");
  });

  it("未成年人给出咨询专业人士的警告", () => {
    const t = deriveTargets({ ...male, age: 15 });
    expect(t.warnings.join("")).toContain("18 岁");
  });

  it("孕期按维持热量并提示", () => {
    const t = deriveTargets({ ...male, sex: "female", flags: ["pregnancy"] });
    expect(t.deficitKcal).toBe(0);
    expect(t.warnings.join("")).toContain("孕期");
  });
});

describe("宏量营养素", () => {
  it("蛋白质 + 碳水 + 脂肪 与总热量一致(±5%)", () => {
    const t = deriveTargets(male);
    const kcal = t.protein * 4 + t.carbs * 4 + t.fat * 9;
    expect(Math.abs(kcal - t.targetKcal) / t.targetKcal).toBeLessThan(0.05);
  });

  it("蛋白质在 1.2-2.4 g/kg 之间", () => {
    const t = deriveTargets(male);
    expect(t.protein / male.weightKg).toBeGreaterThan(1.2);
    expect(t.protein / male.weightKg).toBeLessThan(2.4);
  });
});

describe("四餐热量分配", () => {
  it("四餐合计 ≈ 100%", () => {
    const sum = SLOT_SHARE.breakfast + SLOT_SHARE.lunch + SLOT_SHARE.dinner + SLOT_SHARE.snack;
    expect(sum).toBeCloseTo(1, 5);
  });

  it("午餐是占比最高的一餐", () => {
    const t = deriveTargets(male);
    expect(slotKcal(t, "lunch")).toBeGreaterThan(slotKcal(t, "breakfast"));
    expect(slotKcal(t, "lunch")).toBeGreaterThan(slotKcal(t, "dinner"));
    expect(slotKcal(t, "lunch")).toBeGreaterThan(slotKcal(t, "snack"));
  });
});
