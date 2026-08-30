// 共享类型定义(纯类型,可被服务端/客户端/测试共同引用)

export type Sex = "male" | "female";
export type Experience = "beginner" | "intermediate" | "advanced";
export type Place = "home" | "gym";

/** 训练强度档位 */
export type Intensity = "light" | "standard" | "plus";

export type MealSlotType = "breakfast" | "lunch" | "dinner" | "snack";

export const MEAL_SLOT_LABEL: Record<MealSlotType, string> = {
  breakfast: "早餐",
  lunch: "午餐",
  dinner: "晚餐",
  snack: "加餐",
};

/** 生成计划所需的最小档案输入(与数据库 Profile 字段对齐) */
export interface ProfileInput {
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  bodyFatPct?: number | null;
  goalWeightKg: number;
  durationDays: number; // 7 | 14 | 30
  experience: Experience;
  trainingDaysPerWeek: number; // 1-7
  place: Place;
  equipment: string[];
  dietPrefs: string[];
  allergies: string[];
  disliked: string[];
  budgetYuan: number;
  cookMinutes: number;
  flags: string[];
}

/** 热量与营养目标(由 calc.ts 推导) */
export interface NutritionTargets {
  bmr: number;
  tdee: number;
  targetKcal: number;
  protein: number; // g
  carbs: number; // g
  fat: number; // g
  deficitKcal: number; // 负数表示缺口
  weeklyChangeKg: number; // 预计每周体重变化(负=减)
  warnings: string[];
}

/** 训练块中的一个条目 */
export interface BlockItem {
  exerciseId: string;
  name: string;
  emoji: string;
  kind: "warmup" | "strength" | "cardio" | "stretch";
  sets?: number;
  repsOrDuration?: number; // 次数 或 时长(分钟,kind=cardio)
  unit: "reps" | "seconds" | "minutes";
  restSec?: number;
  tips: string[];
}

/** 单日训练计划(以 JSON 存于 PlanDay.blocks) */
export interface PlanBlocks {
  warmup: BlockItem[];
  strength: BlockItem[];
  cardio: BlockItem[];
  stretch: BlockItem[];
}

export interface PlanDayData {
  date: string; // YYYY-MM-DD
  isTraining: boolean;
  focus: string;
  durationMin: number;
  blocks: PlanBlocks;
}

/** 食材(克数按当前份量比例缩放后) */
export interface MealIngredient {
  name: string;
  grams: number;
  cat: string; // 蛋白质/蔬果/主食/乳品/干货坚果/调味
  note?: string;
}

export interface MealSubstitute {
  for: string;
  options: string[];
}

/** 单餐(以 JSON 存于 MealDay.slots 的一个槽位) */
export interface MealSlot {
  recipeId: string;
  name: string;
  emoji: string;
  scale: number; // 份量缩放比例
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  minutes: number;
  difficulty: 1 | 2 | 3;
  costYuan: number;
  tags: string[];
  ingredients: MealIngredient[];
  steps: string[];
  substitutes: MealSubstitute[];
}

export interface MealDayData {
  breakfast: MealSlot;
  lunch: MealSlot;
  dinner: MealSlot;
  snack: MealSlot;
}

/** 可信来源 */
export interface SourceRef {
  title: string;
  url: string;
  source: string;
  accessedAt: string; // ISO 日期
  summary?: string;
}
