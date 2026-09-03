// 食谱生成引擎(纯函数,可测试)
// 逻辑:按餐次目标热量/预算/过敏原/忌口/偏好/烹饪时长筛选候选 → 稳定种子轮转选菜 →
//       份量缩放(0.6~1.6)对齐热量 → 汇总购物清单。

import { ALLERGEN_MAP, RECIPES, RECIPE_MAP, type Recipe } from "./recipes";
import { slotShareFor } from "./calc";
import type { Goal, MealDayData, MealIngredient, MealSlot, MealSlotType, NutritionTargets, ProfileInput } from "@/types";
import { clamp, hashSeed, round5 } from "./utils";

/** 允许传宽松目标(便于测试),生产使用完整 NutritionTargets */
export type NutritionTargetsLike = Pick<NutritionTargets, "targetKcal"> & { goal?: NutritionTargets["goal"] };

const SLOT_ORDER: MealSlotType[] = ["breakfast", "lunch", "dinner", "snack"];

/** 每餐可接受的烹饪时长上限(占用户设置的比例) */
const SLOT_MINUTES_CAP: Record<MealSlotType, number> = {
  breakfast: 0.6,
  lunch: 1,
  dinner: 1,
  snack: 0.3,
};

/** 每餐预算占比(减脂/维持) */
const SLOT_BUDGET_SHARE: Record<MealSlotType, number> = {
  breakfast: 0.25,
  lunch: 0.38,
  dinner: 0.32,
  snack: 0.1,
};

/** 每餐预算占比(增肌:加餐预算与热量占比一致,否则大容量加餐会被预算挡掉) */
const SLOT_BUDGET_SHARE_BULK: Record<MealSlotType, number> = {
  breakfast: 0.24,
  lunch: 0.33,
  dinner: 0.27,
  snack: 0.16,
};

function budgetShareFor(goal?: Goal): Record<MealSlotType, number> {
  return goal === "bulk" ? SLOT_BUDGET_SHARE_BULK : SLOT_BUDGET_SHARE;
}

/** 增肌模式:优先保留「份量拉满(×2)仍基本够到该餐目标」的食谱,避免热量长期欠账;无则回退原列表 */
function preferCapacity(list: Recipe[], slotKcal: number, goal?: Goal): Recipe[] {
  if (goal !== "bulk") return list;
  const capable = list.filter((r) => r.baseKcal * 2 >= slotKcal * 0.85);
  return capable.length > 0 ? capable : list;
}

function hitAllergy(recipe: Recipe, allergies: string[]): boolean {
  const text = recipe.ingredients.map((i) => i.name).join("|");
  return allergies.some((a) => (ALLERGEN_MAP[a] ?? [a]).some((kw) => text.includes(kw) || recipe.name.includes(kw)));
}

function hitDislike(recipe: Recipe, disliked: string[]): boolean {
  const text = recipe.ingredients.map((i) => i.name).join("|");
  return disliked.some((d) => d.trim() && (text.includes(d.trim()) || recipe.name.includes(d.trim())));
}

/** 偏好匹配得分(素食为硬性约束);增肌模式下高蛋白/高热量权重更高,轻食降权 */
function prefScore(recipe: Recipe, prefs: string[], goal?: Goal): number {
  let score = 0;
  for (const pref of prefs) {
    if (pref === "素食" && recipe.tags.includes("素食")) score += 3;
    if (pref === "高蛋白" && recipe.tags.includes("高蛋白")) score += 2;
    if (pref === "快手菜" && recipe.minutes <= 20) score += 2;
    if (pref === "爱吃辣" && recipe.tags.includes("微辣")) score += 2;
    if (pref === "低碳水" && recipe.carbs <= recipe.baseKcal * 0.12) score += 2;
  }
  if (goal === "bulk") {
    if (recipe.tags.includes("高蛋白")) score += 1;
    if (recipe.tags.includes("增肌")) score += 3;
    if (recipe.tags.includes("低卡")) score -= 2;
    if (recipe.baseKcal >= 450) score += 1; // 优先厚实的一餐
  } else if (goal === "cut") {
    if (recipe.tags.includes("低卡")) score += 1;
  }
  return score;
}

interface CandidateOpts {
  slot: MealSlotType;
  slotKcal: number;
  slotBudget: number;
  minutesCap: number;
}

/** 荤食检测(素食用户的硬性排除条件)。注意:不能匹配 鸡蛋/牛奶 等词,需用精确词表 */
const MEAT_RE = /鸡胸|鸡腿|鸡肉|鸡丁|鸡丝|鸡肝|鸡翅|鸡排|手撕鸡|牛腩|牛里脊|牛肉|牛排|牛柳|猪里脊|猪肉|猪排|肉末|肉松|培根|火腿|午餐肉|香肠|腊肉|虾仁|鲜虾|基围虾|虾|三文鱼|三文|金枪鱼|金枪|鳕鱼|鲈鱼|龙利鱼|鱼柳|鱼肉|扇贝|蛤蜊|干贝|蟹肉|海鲜/;

function hasMeat(recipe: Recipe): boolean {
  return MEAT_RE.test(recipe.name) || recipe.ingredients.some((i) => MEAT_RE.test(i.name));
}

/** 带渐进放宽的候选筛选:保证任何配置下都有候选 */
function candidates(p: ProfileInput, opts: CandidateOpts, goal?: Goal): Recipe[] {
  const isVeg = p.dietPrefs.includes("素食");
  const base = RECIPES.filter((r) => r.slots.includes(opts.slot));

  const passes = (r: Recipe, relax: { budget: boolean; minutes: boolean }) =>
    !hitAllergy(r, p.allergies) &&
    !hitDislike(r, p.disliked) &&
    !(isVeg && hasMeat(r)) &&
    (relax.budget || r.costYuan <= opts.slotBudget * 1.35) &&
    (relax.minutes || r.minutes <= opts.minutesCap);

  for (const relax of [
    { budget: false, minutes: false },
    { budget: true, minutes: false },
    { budget: false, minutes: true },
    { budget: true, minutes: true },
  ]) {
    const list = base
      .filter((r) => passes(r, relax))
      .map((r) => ({ r, score: prefScore(r, p.dietPrefs, goal) + (r.costYuan <= opts.slotBudget ? 1 : 0) }))
      .sort((a, b) => b.score - a.score)
      .map((x) => x.r);
    if (list.length > 0) return list;
  }
  // 最终兜底:只保留「不过敏」这条安全底线(素食约束仍尽量保留)
  const safeList = base.filter((r) => !hitAllergy(r, p.allergies) && !(isVeg && hasMeat(r)));
  return safeList.length > 0 ? safeList : base.filter((r) => !hitAllergy(r, p.allergies));
}

/** 按目标热量缩放一份食谱(bulk 时放宽上限到 2.0,否则高热量目标下会被钳住) */
export function scaleRecipe(recipe: Recipe, targetKcal: number, maxScale = 1.6): MealSlot {
  const scale = clamp(targetKcal / recipe.baseKcal, 0.6, maxScale);
  const r5 = (n: number) => Math.max(5, round5(n));
  return {
    recipeId: recipe.id,
    name: recipe.name,
    emoji: recipe.emoji,
    scale: Math.round(scale * 100) / 100,
    kcal: Math.round(recipe.kcal * scale),
    protein: Math.round(recipe.protein * scale),
    carbs: Math.round(recipe.carbs * scale),
    fat: Math.round(recipe.fat * scale),
    minutes: recipe.minutes,
    difficulty: recipe.difficulty,
    costYuan: Math.round(recipe.costYuan * scale * 10) / 10,
    tags: recipe.tags,
    ingredients: recipe.ingredients.map((i) => ({
      name: i.name,
      grams: r5(i.grams * scale),
      cat: i.cat,
      note: i.note,
    })) as MealIngredient[],
    steps: recipe.steps,
    substitutes: recipe.substitutes,
  };
}

export interface GenerateMealsOpts {
  startDateKey: string;
  days: number;
  targets: NutritionTargetsLike;
  seedBase?: number;
  /** 已用过的 recipeId(用于避免重复),函数会优先避开 */
  usedIds?: Set<string>;
}

/** 生成多天食谱 */
export function generateMeals(p: ProfileInput, opts: GenerateMealsOpts): { date: string; data: MealDayData; seed: number }[] {
  const used = opts.usedIds ?? new Set<string>();
  const out: { date: string; data: MealDayData; seed: number }[] = [];
  for (let i = 0; i < opts.days; i++) {
    const d = new Date(Date.parse(opts.startDateKey + "T00:00:00Z") + i * 86400000);
    const key = d.toISOString().slice(0, 10);
    out.push({ date: key, data: generateMealDay(p, key, opts.targets, opts.seedBase ?? 0, used), seed: hashSeed(key) % 100000 });
  }
  return out;
}

/** 生成单日食谱(不落库) */
export function generateMealDay(
  p: ProfileInput,
  dateKeyStr: string,
  targets: NutritionTargetsLike,
  seedBase = 0,
  usedIds?: Set<string>
): MealDayData {
  const seed = hashSeed(`${p.sex}${p.budgetYuan}${p.cookMinutes}${dateKeyStr}${seedBase}`);
  const data: Partial<Record<MealSlotType, MealSlot>> = {};
  const dayUsed = new Set<string>();
  // 目标以 targets 为准,档案兜底(测试里常只传 targets)
  const goal = targets.goal ?? p.goal;
  const bulk = goal === "bulk";
  const maxScale = bulk ? 2.0 : 1.6;

  for (const slot of SLOT_ORDER) {
    const targetKcal = Math.round(targets.targetKcal * slotShareFor(goal)[slot]);
    const slotBudget = p.budgetYuan * budgetShareFor(goal)[slot];
    const minutesCap = Math.max(5, Math.round(p.cookMinutes * SLOT_MINUTES_CAP[slot]));
    let list = preferCapacity(candidates(p, { slot, slotKcal: targetKcal, slotBudget, minutesCap }, goal), targetKcal, goal);
    // 优先避开本周已用/当日已用
    const fresh = list.filter((r) => !dayUsed.has(r.id) && !(usedIds && usedIds.has(r.id)));
    const notSameDay = list.filter((r) => !dayUsed.has(r.id));
    list = fresh.length > 0 ? fresh : notSameDay.length > 0 ? notSameDay : list;
    const recipe = list[seed % list.length];
    dayUsed.add(recipe.id);
    data[slot] = scaleRecipe(recipe, targetKcal, maxScale);
  }
  return data as MealDayData;
}

/** 换掉某一餐(重新生成单个槽位) */
export function replaceSlot(p: ProfileInput, dateKeyStr: string, slot: MealSlotType, targets: NutritionTargetsLike, excludeIds: string[] = []): MealSlot {
  const goal = targets.goal ?? p.goal;
  const targetKcal = Math.round(targets.targetKcal * slotShareFor(goal)[slot]);
  const slotBudget = p.budgetYuan * budgetShareFor(goal)[slot];
  const minutesCap = Math.max(5, Math.round(p.cookMinutes * SLOT_MINUTES_CAP[slot]));
  const all = candidates(p, { slot, slotKcal: targetKcal, slotBudget, minutesCap }, goal);
  const list = preferCapacity(all, targetKcal, goal).filter((r) => !excludeIds.includes(r.id));
  const finalList = list.length > 0 ? list : all;
  const seed = hashSeed(`${dateKeyStr}${slot}${excludeIds.length}${Math.random()}`);
  return scaleRecipe(finalList[seed % finalList.length], targetKcal, goal === "bulk" ? 2.0 : 1.6);
}

/** 应用用户份量缩放 */
export function rescaleSlot(slotData: MealSlot, scale: number): MealSlot {
  const s = clamp(scale, 0.5, 2);
  const r5 = (n: number) => Math.max(5, round5(n));
  return {
    ...slotData,
    scale: Math.round(s * 100) / 100,
    kcal: Math.round(slotData.kcal * s),
    protein: Math.round(slotData.protein * s),
    carbs: Math.round(slotData.carbs * s),
    fat: Math.round(slotData.fat * s),
    costYuan: Math.round(slotData.costYuan * s * 10) / 10,
    ingredients: slotData.ingredients.map((i) => ({ ...i, grams: r5(i.grams * s) })),
  };
}

// ---------------- 购物清单 ----------------

export interface ShoppingItem {
  name: string;
  grams: number;
  cat: string;
  usedIn: string[];
}

/** 汇总日期范围内的购物清单,同名食材自动合并克数 */
export function buildShoppingList(days: { data: MealDayData }[]): ShoppingItem[] {
  const map = new Map<string, ShoppingItem>();
  for (const day of days) {
    for (const slotName of SLOT_ORDER) {
      const slot = day.data[slotName];
      if (!slot) continue;
      for (const ing of slot.ingredients) {
        const prev = map.get(ing.name);
        if (prev) {
          prev.grams += ing.grams;
          if (!prev.usedIn.includes(slot.name)) prev.usedIn.push(slot.name);
        } else {
          map.set(ing.name, { name: ing.name, grams: ing.grams, cat: ing.cat, usedIn: [slot.name] });
        }
      }
    }
  }
  const catOrder = ["蛋白质", "蔬果", "主食", "乳品", "干货坚果", "调味"];
  return [...map.values()]
    .map((i) => ({ ...i, grams: Math.round(i.grams) }))
    .sort((a, b) => catOrder.indexOf(a.cat) - catOrder.indexOf(b.cat) || a.name.localeCompare(b.name, "zh"));
}

export { SLOT_ORDER };
