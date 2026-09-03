// 热量与营养目标计算(纯函数,可测试)
// 参考:
// - Mifflin-St Jeor 公式(BMR)/ Katch-McArdle 公式(已知体脂率)
// - 1 kg 脂肪组织 ≈ 7700 kcal(常用估算)
// 免责声明:以下输出仅为参考估算,不构成医疗或营养治疗建议。

import { clamp } from "./utils";
import type { Goal, NutritionTargets, ProfileInput } from "@/types";

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

/** 各目标的宏量比例与克数规则 */
const GOAL_RULES = {
  cut: {
    /** 蛋白 g/kg(按水平) */
    protein: { beginner: 1.6, intermediate: 1.8, advanced: 2.2 } as Record<string, number>,
    fatShare: 0.27,
    /** 盈余/缺口相对 TDEE 的最大比例 */
    maxDeltaShare: 0.25,
    maxDeltaAbs: 800,
    minDelta: 250,
  },
  bulk: {
    // 增肌期蛋白 1.6~2.0 即可,多余热量给碳水
    protein: { beginner: 1.6, intermediate: 1.8, advanced: 2.0 } as Record<string, number>,
    fatShare: 0.25,
    maxDeltaShare: 0.12,
    maxDeltaAbs: 350,
    minDelta: 200,
  },
  maintain: {
    protein: { beginner: 1.4, intermediate: 1.6, advanced: 1.8 } as Record<string, number>,
    fatShare: 0.27,
    maxDeltaShare: 0,
    maxDeltaAbs: 0,
    minDelta: 0,
  },
} as const;

/**
 * 推导每日热量与三大营养素目标(按 goal 分支:cut 缺口 / bulk 盈余 / maintain 维持)。
 * 规则(保守优先):
 * - cut:缺口 = (当前体重 - 目标体重) × 7700 / 周期天数,上限 min(800, TDEE×25%),下限 250
 * - bulk:盈余 = (目标体重 - 当前体重) × 7700 / 周期天数,上限 min(350, TDEE×12%),下限 200
 * - maintain:delta = 0
 * - 最低摄入:女性 ≥ 1200 kcal,男性 ≥ 1500 kcal(bulk 天然高于 TDEE,不受影响)
 * - 蛋白质:GOAL_RULES 按目标与水平取 g/kg,热量占比不超过 40%
 * - 脂肪:25%(bulk)/27%(cut、maintain);碳水 = 剩余(增肌期显著抬高)
 */
export function deriveTargets(p: ProfileInput, opts: TargetOptions = {}): NutritionTargets {
  const goal: Goal = p.goal ?? "cut";
  const rules = GOAL_RULES[goal];
  const warnings: string[] = [];
  const bmr = calcBMR(p);
  const tdee = bmr * activityFactor(p.trainingDaysPerWeek);

  // delta > 0 表示盈余(bulk),< 0 表示缺口(cut)
  let delta = 0;
  if (goal === "cut") {
    const lossKg = p.weightKg - p.goalWeightKg;
    const needLoss = lossKg > 0.3;
    if (needLoss && opts.deficitEnabled !== false) {
      const days = Math.max(7, p.durationDays);
      const required = (lossKg * 7700) / days;
      delta = -clamp(required, rules.minDelta, Math.min(rules.maxDeltaAbs, tdee * rules.maxDeltaShare));
    }
  } else if (goal === "bulk") {
    const gainKg = p.goalWeightKg - p.weightKg;
    const needGain = gainKg > 0.3;
    if (needGain) {
      const days = Math.max(7, p.durationDays);
      const required = (gainKg * 7700) / days;
      delta = clamp(required, rules.minDelta, Math.min(rules.maxDeltaAbs, tdee * rules.maxDeltaShare));
    } else {
      // 未设更高目标体重时,按保守的中等盈余起步,并提示校准
      delta = Math.min(250, Math.round(tdee * 0.08));
      warnings.push("你还没有设置高于当前体重的目标体重,已按约 +250 kcal 的保守盈余起步;建议把目标体重设为高于当前 2~4 kg 以监测增肌节奏。");
    }
  }

  // 特殊状况:安全优先,任何目标都回落维持热量
  if (p.flags.includes("pregnancy")) {
    delta = 0;
    warnings.push(goal === "bulk"
      ? "孕期/哺乳期不建议自行增肌加量,已按维持热量处理,请以医生与注册营养师的建议为准。"
      : "孕期/哺乳期不建议减脂,已按维持热量处理,请以医生与注册营养师的建议为准。");
  }
  if (p.flags.includes("ed_history")) {
    delta = 0;
    warnings.push("有饮食障碍史时,已按维持热量处理;请优先在专业人士陪伴下制定饮食计划,本应用的建议仅供参考。");
  }
  if (p.flags.includes("chronic") && Math.abs(delta) > tdee * 0.1) {
    delta = Math.sign(delta) * Math.round(tdee * 0.1);
    warnings.push("你标记了慢性疾病/特殊健康状况,已收窄热量调整幅度;开始训练与饮食调整前请咨询医生。");
  }

  // BMI 偏低:不建议继续减重(cut 清零;bulk 时偏瘦正适合增肌,保留盈余)
  if (goal === "cut" && p.weightKg / Math.pow(p.heightCm / 100, 2) < 18.5) {
    delta = 0;
    warnings.push("你的 BMI 低于 18.5(偏瘦),不建议继续减重;目标已按维持热量处理。");
  }

  // 未成年:任何目标都不做主动热量调整
  if (p.age < 18) {
    if (delta !== 0) {
      delta = 0;
      warnings.push("你还未满 18 岁,处于生长发育期,不建议自行执行热量盈余/缺口计划,请务必在家长/医生/营养师指导下进行。");
    } else {
      warnings.push("你还未满 18 岁,处于生长发育期,请务必在家长/医生/营养师指导下进行训练与饮食安排。");
    }
  }

  let targetKcal = tdee + delta;

  // 安全下限
  const floorKcal = p.sex === "male" ? 1500 : 1200;
  if (targetKcal < floorKcal) {
    warnings.push(
      `按你的目标推导的摄入低于安全下限,已上调至 ${floorKcal} kcal。更慢的减重节奏更可持续,建议延长周期或咨询专业人士。`
    );
    targetKcal = floorKcal;
    delta = targetKcal - tdee;
  }

  // 增肌增速提示(lean bulk 节奏)
  if (goal === "bulk" && delta > 0) {
    warnings.push("增肌期建议每周体重上升 0.25~0.5 kg(干净增重);连续两周涨幅超过 0.7 kg 时,把份量回调一档。");
  }

  // 宏量营养素
  const proteinPerKg = rules.protein[p.experience] ?? 1.6;
  let protein = Math.round(p.weightKg * proteinPerKg);
  // 蛋白质热量不超过 40%
  protein = Math.min(protein, Math.round((targetKcal * 0.4) / 4));
  const fat = Math.round((targetKcal * rules.fatShare) / 9);
  let carbs = Math.round((targetKcal - protein * 4 - fat * 9) / 4);
  if (carbs < 80) {
    carbs = 80;
    protein = Math.max(Math.round(p.weightKg * 1.2), Math.round(((targetKcal - carbs * 4 - fat * 9) / 4)));
  }

  const weeklyChangeKg = (delta * 7) / 7700;

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    targetKcal: Math.round(targetKcal),
    protein,
    carbs,
    fat,
    deficitKcal: Math.round(delta) || 0,
    weeklyChangeKg: Math.round(weeklyChangeKg * 100) / 100,
    warnings,
    goal,
  };
}

/** 四餐热量分配比例(减脂/维持) */
export const SLOT_SHARE: Record<"breakfast" | "lunch" | "dinner" | "snack", number> = {
  breakfast: 0.27,
  lunch: 0.35,
  dinner: 0.28,
  snack: 0.1,
};

/** 四餐热量分配比例(增肌:提高加餐占比,更容易吃到盈余) */
export const SLOT_SHARE_BULK: Record<"breakfast" | "lunch" | "dinner" | "snack", number> = {
  breakfast: 0.25,
  lunch: 0.33,
  dinner: 0.26,
  snack: 0.16,
};

export function slotShareFor(goal?: Goal): typeof SLOT_SHARE {
  return goal === "bulk" ? SLOT_SHARE_BULK : SLOT_SHARE;
}

export function slotKcal(targets: Pick<NutritionTargets, "targetKcal" | "goal">, slot: keyof typeof SLOT_SHARE): number {
  return Math.round(targets.targetKcal * slotShareFor(targets.goal)[slot]);
}
