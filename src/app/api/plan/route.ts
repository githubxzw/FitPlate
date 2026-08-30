import { db } from "@/lib/db";
import { handle, ok, ApiError, requireUserId } from "@/lib/api";
import { dateKeySchema } from "@/lib/validation";
import { z } from "zod";
import { planWindow, regenerateAllPlanDays, regeneratePlanDay } from "@/lib/plan-service";
import { dateKey, parseDateKey, todayKey } from "@/lib/utils";

/** GET /api/plan?from=YYYY-MM-DD&to=YYYY-MM-DD → 训练日列表 */
export const GET = handle(async (req: Request) => {
  const userId = await requireUserId();
  const { searchParams } = new URL(req.url);
  const profile = await db.profile.findUnique({ where: { userId } });
  if (!profile) throw new ApiError(404, "还没有档案,请先完成问卷");

  const from = searchParams.get("from") ?? planWindow(profile).from;
  const to = searchParams.get("to") ?? planWindow(profile).to;
  dateKeySchema.parse(from);
  dateKeySchema.parse(to);

  const days = await db.planDay.findMany({
    where: { userId, date: { gte: parseDateKey(from), lte: parseDateKey(to) } },
    orderBy: { date: "asc" },
  });
  return ok({
    from,
    to,
    days: days.map((d) => ({
      date: dateKey(d.date),
      isTraining: d.isTraining,
      focus: d.focus,
      intensity: d.intensity,
      blocks: d.blocks,
      aiTips: d.aiTips,
      sources: d.sources,
      completed: d.completed,
    })),
  });
});

/** POST /api/plan → 生成/重新生成 { scope: "all" | "day", date? } */
export const POST = handle(async (req: Request) => {
  const userId = await requireUserId();
  const body = z
    .object({ scope: z.enum(["all", "day"]), date: dateKeySchema.optional() })
    .parse(await req.json());
  const profile = await db.profile.findUnique({ where: { userId } });
  if (!profile) throw new ApiError(404, "还没有档案,请先完成问卷");

  if (body.scope === "all") {
    const result = await regenerateAllPlanDays(userId, profile, body.date ?? todayKey());
    return ok(result);
  }
  if (!body.date) throw new ApiError(422, "scope=day 时必须提供 date");
  const day = await regeneratePlanDay(userId, profile, body.date);
  return ok(day);
});
