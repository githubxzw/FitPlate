import { db } from "@/lib/db";
import { handle, ok, ApiError, requireUserId } from "@/lib/api";
import { mealPatchSchema } from "@/lib/validation";
import { replaceMealSlot, scaleMealSlot } from "@/lib/plan-service";
import type { MealSlotType } from "@/types";

/** PATCH /api/meals/day → 单餐操作:{ action: "swap" } 换一道 / { action: "scale", scale: 1.2 } 调份量 */
export const PATCH = handle(async (req: Request) => {
  const userId = await requireUserId();
  const body = mealPatchSchema.parse(await req.json());
  const slot = body.slot as MealSlotType;

  if (body.action === "swap") {
    const profile = await db.profile.findUnique({ where: { userId } });
    if (!profile) throw new ApiError(404, "还没有档案,请先完成问卷");
    const result = await replaceMealSlot(userId, profile, body.date, slot);
    return ok(result);
  }
  const result = await scaleMealSlot(userId, body.date, slot, body.scale as number);
  return ok(result);
});
