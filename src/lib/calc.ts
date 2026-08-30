// 热量与营养目标计算(纯函数,可测试)
// 参考:
// - Mifflin-St Jeor 公式(BMR)/ Katch-McArdle 公式(已知体脂率)
// - 1 kg 脂肪组织 ≈ 7700 kcal(常用估算)
// 免责声明:以下输出仅为参考估算,不构成医疗或营养治疗建议。

import { clamp } from "./utils";
import type { NutritionTargets, ProfileInput } from "@/types";

/** 活动系数:按每周可训练天数粗略映射 */
export function activityFactor(trainingDaysPerWeek: number): number {
  const d = clamp(Math.round(trainingDaysPerWeek), 0, 7);
  if (d <= 0) return 1.2;
  if (d <= 2) return 1.375;
  if (d <= 4) return 1.55;
  if (d <= 6) return 1.725;
  return 1.9;
}

/** 基础代谢 BMR(kcal):有体脂率用 Katch-McArdle,否则 Mifflin-St Jeor */
export function calcBMR(p: Pick<ProfileInput, "sex" | "age" | "heightCm" | "weightKg" | "bodyFatPct">): number {
  if (p.bodyFatPct && p.bodyFatPct >= 5 && p.bodyFatPct <= 60) {
    const lbm = p.weightKg * (1 - p.bodyFatPct / 100);
    return 370 + 21.6 * lbm;
  }
  const base = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age;
  return p.sex === "male" ? base + 5 : base - 161;
}

export interface TargetOptions {
  /** 是否允许制造热量缺口(默认 true) */
  deficitEnabled?: boolean;
}

/**
 * 推导每日热量与三大营养素目标。
 * 规则(保守优先):
 * - 所需缺口 = (当前体重 - 目标体重) × 7700 / 周期天数
 * - 缺口上限:min(800, TDEE × 25%),下限 250(需要减重时)
 * - 最低摄入:女性 ≥ 1200 kcal,男性 ≥ 1500 kcal
 * - 蛋白质:1.6~2.2 g/kg(按运动水平),热量占比不超过 40%
 * - 脂肪:25%~30% 热量;碳水 = 剩余
 */
export function deriveTargets(p: ProfileInput, opts: TargetOptions = {}): NutritionTargets {
  const warnings: string[] = [];
  const bmr = calcBMR(p);
  const tdee = bmr * activityFactor(p.trainingDaysPerWeek);

  const lossKg = p.weightKg - p.goalWeightKg;
  const needLoss = lossKg > 0.3;
  let deficit = 0;

  if (needLoss && opts.deficitEnabled !== false) {
    const days = Math.max(7, p.durationDays);
    const required = (lossKg * 7700) / days;
    deficit = clamp(required, 250, Math.min(800, tdee * 0.25));
  }

  // 特殊状况:安全优先,直接按维持热量处理(不制造缺口)
  if (p.flags.includes("pregnancy")) {
    deficit = 0;
    warnings.push("孕期/哺乳期不建议减脂,已按维持热量处理,请以医生与注册营养师的建议为准。");
  }
  if (p.flags.includes("ed_history")) {
    deficit = 0;
    warnings.push("有饮食障碍史时,已按维持热量处理;请优先在专业人士陪伴下制定饮食计划,本应用的建议仅供参考。");
  }
  if (p.flags.includes("chronic") && deficit > tdee * 0.15) {
    deficit = Math.round(tdee * 0.15);
    warnings.push("你标记了慢性疾病/特殊健康状况,已放宽热量缺口;开始训练与饮食调整前请咨询医生。");
  }

  // BMI 偏低:不建议继续减重
  if (p.weightKg / Math.pow(p.heightCm / 100, 2) < 18.5) {
    deficit = 0;
    warnings.push("你的 BMI 低于 18.5(偏瘦),不建议继续减重;目标已按维持热量处理。");
  }

  let targetKcal = tdee - deficit;

  // 安全下限
  const floorKcal = p.sex === "male" ? 1500 : 1200;
  if (targetKcal < floorKcal) {
    warnings.push(
      `按你的目标推导的摄入低于安全下限,已上调至 ${floorKcal} kcal。更慢的减重节奏更可持续,建议延长周期或咨询专业人士。`
    );
    targetKcal = floorKcal;
    deficit = tdee - targetKcal;
  }

  if (p.age < 18) {
    warnings.push("你还未满 18 岁,处于生长发育期,不建议自行执行热量缺口计划,请务必在家长/医生/营养师指导下进行。");
  }

  // 宏量营养素
  const proteinPerKg = p.experience === "advanced" ? 2.2 : p.experience === "intermediate" ? 1.8 : 1.6;
  let protein = Math.round(p.weightKg * proteinPerKg);
  // 蛋白质热量不超过 40%
  protein = Math.min(protein, Math.round((targetKcal * 0.4) / 4));
  const fat = Math.round((targetKcal * 0.27) / 9);
  let carbs = Math.round((targetKcal - protein * 4 - fat * 9) / 4);
  if (carbs < 80) {
    carbs = 80;
    protein = Math.max(Math.round(p.weightKg * 1.2), Math.round(((targetKcal - carbs * 4 - fat * 9) / 4)));
  }

  const weeklyChangeKg = (-deficit * 7) / 7700;

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    targetKcal: Math.round(targetKcal),
    protein,
    carbs,
    fat,
    deficitKcal: Math.round(-deficit) || 0,
    weeklyChangeKg: Math.round(weeklyChangeKg * 100) / 100,
    warnings,
  };
}

/** 四餐热量分配比例 */
export const SLOT_SHARE: Record<"breakfast" | "lunch" | "dinner" | "snack", number> = {
  breakfast: 0.27,
  lunch: 0.35,
  dinner: 0.28,
  snack: 0.1,
};

export function slotKcal(targets: NutritionTargets, slot: keyof typeof SLOT_SHARE): number {
  return Math.round(targets.targetKcal * SLOT_SHARE[slot]);
}
