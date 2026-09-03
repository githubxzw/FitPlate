import { describe, expect, it } from "vitest";
import { buildShoppingList, generateMealDay, replaceSlot, scaleRecipe, RECIPE } from "./helpers";
import { SLOT_SHARE_BULK } from "@/lib/calc";

const base = {
  sex: "female" as const,
  age: 30,
  heightCm: 162,
  weightKg: 62,
  bodyFatPct: null,
  goalWeightKg: 55,
  durationDays: 7,
  experience: "beginner" as const,
  trainingDaysPerWeek: 3,
  place: "home" as const,
  equipment: ["mat"],
  dietPrefs: [] as string[],
  allergies: [] as string[],
  disliked: [] as string[],
  budgetYuan: 45,
  cookMinutes: 40,
  flags: [] as string[],
};

const targets = { targetKcal: 1500 };

describe("增肌(bulk)食谱", () => {
  const bulkTargets = { targetKcal: 3200, goal: "bulk" as const };

  it("加餐按更高占比分配(接近目标的16%)", () => {
    const day = generateMealDay(base, "2026-09-01", bulkTargets, 3);
    const want = Math.round(3200 * SLOT_SHARE_BULK.snack);
    expect(Math.abs(day.snack.kcal - want) / want).toBeLessThan(0.45);
  });

  it("高热量目标下份量缩放可超过 1.6(bulk 上限放宽到 2.0)", () => {
    const day = generateMealDay(base, "2026-09-01", bulkTargets, 3);
    const slots = [day.breakfast, day.lunch, day.dinner, day.snack];
    expect(slots.some((s) => s.scale > 1.6)).toBe(true);
    for (const s of slots) expect(s.scale).toBeLessThanOrEqual(2.0);
  });

  it("cut 目标仍按 1.6 上限缩放", () => {
    const day = generateMealDay(base, "2026-09-01", { targetKcal: 3200, goal: "cut" }, 3);
    for (const s of [day.breakfast, day.lunch, day.dinner, day.snack]) expect(s.scale).toBeLessThanOrEqual(1.6);
  });

  it("bulk 单日热量仍接近目标(±25%)", () => {
    const day = generateMealDay(base, "2026-09-01", bulkTargets, 9);
    const total = day.breakfast.kcal + day.lunch.kcal + day.dinner.kcal + day.snack.kcal;
    expect(Math.abs(total - 3200) / 3200).toBeLessThan(0.25);
  });

  it("bulk 优先选份量够得到目标的食谱(多日合计不长期欠账)", () => {
    for (let seed = 0; seed < 5; seed++) {
      const day = generateMealDay(base, `2026-09-0${seed + 1}`, bulkTargets, seed);
      const total = day.breakfast.kcal + day.lunch.kcal + day.dinner.kcal + day.snack.kcal;
      expect(total).toBeGreaterThanOrEqual(3200 * 0.8);
    }
  });

  it("海鲜过敏者不会被推荐增肌海鲜食谱", () => {
    for (let i = 0; i < 20; i++) {
      const day = generateMealDay({ ...base, allergies: ["海鲜"] }, `2026-09-0${(i % 9) + 1}`, bulkTargets, i);
      for (const slot of [day.breakfast, day.lunch, day.dinner, day.snack]) {
        expect(slot.recipeId).not.toMatch(/salmon|shrimp|tuna|cod/);
        const names = slot.ingredients.map((x) => x.name).join("|");
        expect(names).not.toMatch(/虾|三文|金枪|鲈|鳕|龙利/);
      }
    }
  });

  it("素食者不会被推荐含肉增肌食谱", () => {
    for (let i = 0; i < 20; i++) {
      const day = generateMealDay({ ...base, dietPrefs: ["素食"] }, `2026-09-0${(i % 9) + 1}`, bulkTargets, i);
      for (const slot of [day.breakfast, day.lunch, day.dinner, day.snack]) {
        expect(slot.recipeId).not.toMatch(/beef|salmon|chicken|tuna|shrimp/);
      }
    }
  });

  it("四道增肌食谱营养内部一致且可被缩放", () => {
    for (const id of ["bg-bulk-oats", "ln-bulk-beef-rice", "dn-bulk-salmon-potato", "sn-bulk-shake"]) {
      const r = RECIPE(id);
      const kcal = r.protein * 4 + r.carbs * 4 + r.fat * 9;
      expect(Math.abs(kcal - r.kcal) / r.kcal).toBeLessThan(0.2);
      const scaled = scaleRecipe(r, r.baseKcal, 2.0);
      expect(scaled.ingredients).toHaveLength(r.ingredients.length);
      expect(scaled.tags).toContain("增肌");
    }
  });
});

describe("食谱生成:过敏原与忌口过滤", () => {
  it("海鲜过敏者不会被推荐含虾/鱼/三文鱼的食谱", () => {
    for (let i = 0; i < 30; i++) {
      const day = generateMealDay({ ...base, allergies: ["海鲜"] }, `2026-09-0${(i % 9) + 1}`, targets, i);
      for (const slot of [day.breakfast, day.lunch, day.dinner, day.snack]) {
        const names = slot.ingredients.map((x) => x.name).join("|");
        expect(names).not.toMatch(/虾|三文|金枪|鲈|鳕|龙利/);
      }
    }
  });

  it("鸡蛋过敏者不被推荐含蛋食谱", () => {
    for (let i = 0; i < 12; i++) {
      const day = generateMealDay({ ...base, allergies: ["鸡蛋"] }, `2026-09-1${i % 9}`, targets, i);
      for (const slot of [day.breakfast, day.lunch, day.dinner, day.snack]) {
        const names = slot.ingredients.map((x) => x.name).join("|");
        expect(names).not.toMatch(/鸡蛋|蛋皮/);
      }
    }
  });

  it("自定义忌口(如香菜)生效", () => {
    for (let i = 0; i < 12; i++) {
      const day = generateMealDay({ ...base, disliked: ["藜麦"] }, `2026-09-0${i + 1}`, targets, i);
      for (const slot of [day.lunch, day.dinner]) {
        const names = slot.ingredients.map((x) => x.name).join("|");
        expect(names).not.toContain("藜麦");
      }
    }
  });
});

describe("食谱生成:热量与预算", () => {
  it("单日计划总热量接近目标(±20%)", () => {
    const day = generateMealDay(base, "2026-09-10", targets, 7);
    const total = day.breakfast.kcal + day.lunch.kcal + day.dinner.kcal + day.snack.kcal;
    expect(Math.abs(total - targets.targetKcal) / targets.targetKcal).toBeLessThan(0.2);
  });

  it("单餐成本不超过预算(含 35% 容差)", () => {
    const budgets = { breakfast: 10, lunch: 20, dinner: 18, snack: 5 } as const;
    const p = { ...base, budgetYuan: 50 };
    const day = generateMealDay(p, "2026-09-10", targets, 3);
    expect(day.breakfast.costYuan).toBeLessThanOrEqual(budgets.breakfast * 1.35 + 0.5);
    expect(day.lunch.costYuan).toBeLessThanOrEqual(budgets.lunch * 1.35 + 0.5);
    expect(day.dinner.costYuan).toBeLessThanOrEqual(budgets.dinner * 1.35 + 0.5);
    expect(day.snack.costYuan).toBeLessThanOrEqual(budgets.snack * 1.35 + 0.5);
  });

  it("烹饪时长超过上限的菜被排除(快手场景)", () => {
    const day = generateMealDay({ ...base, cookMinutes: 15 }, "2026-09-10", targets, 5);
    expect(day.breakfast.minutes).toBeLessThanOrEqual(15);
    expect(day.snack.minutes).toBeLessThanOrEqual(15);
  });

  it("素食者不会拿到含肉/海鲜的菜", () => {
    for (let i = 0; i < 12; i++) {
      const day = generateMealDay({ ...base, dietPrefs: ["素食"] }, `2026-09-0${(i % 9) + 1}`, targets, i);
      for (const slot of [day.breakfast, day.lunch, day.dinner, day.snack]) {
        const names = slot.ingredients.map((x) => x.name).join("|");
        expect(names).not.toMatch(/鸡胸|牛腩|牛里脊|牛肉末|鸡腿|猪|三文|金枪|虾仁|鲈|鳕|龙利/);
      }
    }
  });
});

describe("份量缩放与替换", () => {
  it("scaleRecipe 按目标热量缩放克数与营养", () => {
    const recipe = RECIPE("ln-chicken-quinoa");
    const scaled = scaleRecipe(recipe, 585); // ≈1.5x
    expect(scaled.scale).toBeGreaterThan(1.4);
    expect(scaled.ingredients[0].grams).toBe(Math.round((recipe.ingredients[0].grams * scaled.scale) / 5) * 5);
    expect(scaled.protein).toBe(Math.round(recipe.protein * scaled.scale));
  });

  it("replaceSlot 换出与排除列表不同的菜", () => {
    const current = generateMealDay(base, "2026-09-10", targets, 1).lunch;
    const next = replaceSlot(base, "2026-09-10", "lunch", targets, [current.recipeId]);
    expect(next.recipeId).not.toBe(current.recipeId);
  });
});

describe("购物清单合并", () => {
  it("同名食材克数自动合并", () => {
    const list = buildShoppingList([
      { data: generateMealDay(base, "2026-09-10", targets, 11) },
      { data: generateMealDay(base, "2026-09-11", targets, 12) },
    ]);
    const names = list.map((i) => i.name);
    expect(new Set(names).size).toBe(names.length); // 无重复
    const eggs = list.find((i) => i.name.includes("鸡蛋"));
    if (eggs) {
      expect(eggs.grams).toBeGreaterThan(0);
      expect(eggs.cat.length).toBeGreaterThan(0);
    }
    // 类别顺序:蛋白质在前、调味在后
    const first = list[0];
    expect(first.cat).toBe("蛋白质");
  });
});
