import { db } from "@/lib/db";
import { handle, ok, ApiError, requireUserId, tooMany } from "@/lib/api";
import { dateKeySchema } from "@/lib/validation";
import { z } from "zod";
import { planWindow, regenerateAllPlanDays, regeneratePlanDay } from "@/lib/plan-service";
import { dateKey, parseDateKey, todayKey } from "@/lib/utils";
import { rateLimit } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";

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

/** POST /api/plan → 生成/重新生成 { scope: "all" | "day", date? }(含频控) */
export const POST = handle(async (req: Request) => {
  const userId = await requireUserId();
  const body = z
    .object({ scope: z.enum(["all", "day"]), date: dateKeySchema.optional() })
    .parse(await req.json());
  const profile = await db.profile.findUnique({ where: { userId } });
  if (!profile) throw new ApiError(404, "还没有档案,请先完成问卷");

  if (body.scope === "all") {
    // 全量重生成是重操作:与饮食全量重生成共享每小时 6 次的额度
    const rl = rateLimit(`gen-all:${userId}`, 6, 60 * 60_000);
    if (!rl.ok) return tooMany(rl.retryAfterSec, "重新生成过于频繁,请稍后再试(每小时 6 次)");
    const result = await regenerateAllPlanDays(userId, profile, body.date ?? todayKey());
    audit("plan_regen_all", { userId, from: result.from });
    return ok(result);
  }
  if (!body.date) throw new ApiError(422, "scope=day 时必须提供 date");
  const rlDay = rateLimit(`gen-day:${userId}`, 60, 24 * 60 * 60_000);
  if (!rlDay.ok) return tooMany(rlDay.retryAfterSec, "今日重新生成次数已达上限,请明天再试");
  const day = await regeneratePlanDay(userId, profile, body.date);
  return ok(day);
});
