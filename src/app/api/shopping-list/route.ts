import { db } from "@/lib/db";
import { handle, ok, requireUserId } from "@/lib/api";
import { buildShoppingList } from "@/lib/meal-engine";
import type { MealDayData } from "@/types";
import { dateKey, parseDateKey, fromJson } from "@/lib/utils";

/** GET /api/shopping-list?from&to → 按食材合并的购物清单 */
export const GET = handle(async (req: Request) => {
  const userId = await requireUserId();
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const where = from && to ? { userId, date: { gte: parseDateKey(from), lte: parseDateKey(to) } } : { userId };
  const rows = await db.mealDay.findMany({ where, orderBy: { date: "asc" } });

  const items = buildShoppingList(
    rows.map((r) => ({ date: dateKey(r.date), data: fromJson<MealDayData>(r.slots) }))
  );
  return ok({ from: from ?? null, to: to ?? null, count: rows.length, items });
});
