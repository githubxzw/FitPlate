import { db } from "@/lib/db";
import { handle, ok, ApiError, requireUserId } from "@/lib/api";
import { planPatchSchema } from "@/lib/validation";
import { rescaleBlocks } from "@/lib/workout-engine";
import { updatePlanDay } from "@/lib/plan-service";
import { dateKey, fromJson } from "@/lib/utils";
import type { PlanBlocks } from "@/types";

/** PATCH /api/plan/day → 编辑单日训练:强度档(自动重缩放)/ 区块(组数次数等)/ 打卡 */
export const PATCH = handle(async (req: Request) => {
  const userId = await requireUserId();
  const body = planPatchSchema.parse(await req.json());
  const date = new Date(body.date + "T00:00:00.000Z");

  const existing = await db.planDay.findUnique({ where: { userId_date: { userId, date } } });
  if (!existing) throw new ApiError(404, "该日期还没有训练计划");

  if (body.intensity) {
    // 切换强度档:在现有结构上重缩放数值(保留用户手动替换过的动作选择)
    const blocks = rescaleBlocks(fromJson<PlanBlocks>(existing.blocks), body.intensity);
    const updated = await updatePlanDay(userId, body.date, { intensity: body.intensity, blocks, completed: body.completed });
    return ok({
      date: dateKey(updated.date),
      intensity: updated.intensity,
      blocks: updated.blocks,
      completed: updated.completed,
    });
  }

  const updated = await updatePlanDay(userId, body.date, body);
  return ok({
    date: dateKey(updated.date),
    intensity: updated.intensity,
    blocks: updated.blocks,
    completed: updated.completed,
  });
});
