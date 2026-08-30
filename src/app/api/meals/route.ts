import { db } from "@/lib/db";
import { handle, ok, ApiError, requireUserId, tooMany } from "@/lib/api";
import { dateKeySchema } from "@/lib/validation";
import { regenerateAllMealDays, regenerateMealDay, targetsFor } from "@/lib/plan-service";
import { dateKey, parseDateKey } from "@/lib/utils";
import { rateLimit } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";

/** GET /api/meals?from&to → 饮食日列表 */
export const GET = handle(async (req: Request) => {
  const userId = await requireUserId();
  const { searchParams } = new URL(req.url);
  const profile = await db.profile.findUnique({ where: { userId } });
  if (!profile) throw new ApiError(404, "还没有档案,请先完成问卷");

  const win = { from: dateKey(profile.startDate), to: dateKey(new Date(parseDateKey(dateKey(profile.startDate)).getTime() + (profile.durationDays - 1) * 86400000)) };
  const from = searchParams.get("from") ?? win.from;
  const to = searchParams.get("to") ?? win.to;
  dateKeySchema.parse(from);
  dateKeySchema.parse(to);

  const rows = await db.mealDay.findMany({
    where: { userId, date: { gte: parseDateKey(from), lte: parseDateKey(to) } },
    orderBy: { date: "asc" },
  });
  return ok({
    from,
    to,
    targets: targetsFor(profile),
    days: rows.map((r) => ({
      date: dateKey(r.date),
      targetKcal: r.targetKcal,
      targetProtein: r.targetProtein,
      targetCarbs: r.targetCarbs,
      targetFat: r.targetFat,
      slots: r.slots,
      completedSlots: r.completedSlots,
      sources: r.sources,
    })),
  });
});

/** POST /api/meals → 生成/重新生成 { scope: "all" | "day", date? }(含频控) */
export const POST = handle(async (req: Request) => {
  const userId = await requireUserId();
  const { searchParams } = new URL(req.url);
  const scope = searchParams.get("scope") ?? "all";
  const date = searchParams.get("date");
  const profile = await db.profile.findUnique({ where: { userId } });
  if (!profile) throw new ApiError(404, "还没有档案,请先完成问卷");

  if (scope === "day") {
    if (!date) throw new ApiError(422, "scope=day 时必须提供 date");
    dateKeySchema.parse(date);
    const rl = rateLimit(`gen-day:${userId}`, 60, 24 * 60 * 60_000);
    if (!rl.ok) return tooMany(rl.retryAfterSec, "今日重新生成次数已达上限,请明天再试");
    const slots = await regenerateMealDay(userId, profile, date);
    return ok({ date, slots });
  }
  // 全量重生成:与训练全量重生成共享每小时 6 次的额度
  const rl = rateLimit(`gen-all:${userId}`, 6, 60 * 60_000);
  if (!rl.ok) return tooMany(rl.retryAfterSec, "重新生成过于频繁,请稍后再试(每小时 6 次)");
  const result = await regenerateAllMealDays(userId, profile);
  audit("meal_regen_all", { userId, from: result.from });
  return ok(result);
});
