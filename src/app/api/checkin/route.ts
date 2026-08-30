import { db } from "@/lib/db";
import { handle, ok, ApiError, requireUserId } from "@/lib/api";
import { checkinSchema } from "@/lib/validation";
import { toggleMealSlot, updatePlanDay } from "@/lib/plan-service";
import { dateKey, parseDateKey } from "@/lib/utils";

/** POST /api/checkin → 打卡 { date, kind: workout|breakfast|lunch|dinner|snack, value } */
export const POST = handle(async (req: Request) => {
  const userId = await requireUserId();
  const body = checkinSchema.parse(await req.json());
  const date = parseDateKey(body.date);

  if (body.kind === "workout") {
    const day = await db.planDay.findUnique({ where: { userId_date: { userId, date } } });
    if (!day) throw new ApiError(404, "该日期还没有训练计划");
    const updated = await updatePlanDay(userId, body.date, { completed: body.value });
    return ok({ kind: body.kind, value: updated.completed, date: dateKey(updated.date) });
  }

  const mealDay = await db.mealDay.findUnique({ where: { userId_date: { userId, date } } });
  if (!mealDay) throw new ApiError(404, "该日期还没有饮食计划");
  await toggleMealSlot(userId, body.date, body.kind, body.value);
  const after = await db.mealDay.findUnique({ where: { userId_date: { userId, date } } });
  return ok({ kind: body.kind, value: body.value, date: body.date, completedSlots: after?.completedSlots ?? [] });
});
