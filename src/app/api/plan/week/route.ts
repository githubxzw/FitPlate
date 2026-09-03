import { db } from "@/lib/db";
import { handle, ok, ApiError, requireUserId, tooMany } from "@/lib/api";
import { saveWeekSchema } from "@/lib/validation";
import { regenerateAllPlanDays } from "@/lib/plan-service";
import { rateLimit } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";
import { todayKey } from "@/lib/utils";

/** GET /api/plan/week → 当前自定义周模板与启用状态 */
export const GET = handle(async () => {
  const userId = await requireUserId();
  const profile = await db.profile.findUnique({ where: { userId } });
  if (!profile) throw new ApiError(404, "还没有档案,请先完成问卷");
  return ok({
    week: profile.customWeek ?? null,
    enabled: profile.customWeekEnabled,
  });
});

const putSchema = saveWeekSchema;

/** PUT /api/plan/week → 保存自定义周模板(可选立即重生成) */
export const PUT = handle(async (req: Request) => {
  const userId = await requireUserId();
  const body = putSchema.parse(await req.json());
  const profile = await db.profile.findUnique({ where: { userId } });
  if (!profile) throw new ApiError(404, "还没有档案,请先完成问卷");

  if (body.regenerate) {
    const rl = rateLimit(`gen-all:${userId}`, 6, 60 * 60_000);
    if (!rl.ok) return tooMany(rl.retryAfterSec, "重新生成过于频繁,请稍后再试(每小时 6 次)");
  }

  const updated = await db.profile.update({
    where: { userId },
    data: {
      customWeek: body.week as never,
      customWeekEnabled: body.enabled,
    },
  });

  let result: { from: string; count: number; skippedCompleted: number } | null = null;
  if (body.regenerate && body.enabled) {
    const { from, count, skippedCompleted } = await regenerateAllPlanDays(userId, updated, todayKey());
    result = { from, count, skippedCompleted };
    audit("plan_week_regen", { userId, from });
  }

  return ok({
    week: updated.customWeek,
    enabled: updated.customWeekEnabled,
    regenerated: result,
  });
});
