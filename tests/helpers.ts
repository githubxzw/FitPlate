// 测试辅助:统一从源码模块导出(便于在测试里复用)
import { RECIPE_MAP } from "@/lib/recipes";

export { buildShoppingList, generateMealDay, replaceSlot, scaleRecipe } from "@/lib/meal-engine";

export function RECIPE(id: string) {
  const r = RECIPE_MAP[id];
  if (!r) throw new Error(`recipe not found: ${id}`);
  return r;
}
