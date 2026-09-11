import { db } from "@/lib/db";
import { handle, ok, requireUserId, tooMany } from "@/lib/api";
import { dailyLogSchema } from "@/lib/validation";
import { dateKey, parseDateKey, todayKey } from "@/lib/utils";
import { rateLimit } from "@/lib/rate-limit";
import { clamp } from "@/lib/utils";

/** GET /api/daily-log?from&to → 体重/饮水日志列表(默认最近 180 天) */
export const GET = handle(async (req: Request) => {
  const userId = await requireUserId();
  const { searchParams } = new URL(req.url);
  const today = parseDateKey(todayKey());
  const from = searchParams.get("from") ? parseDateKey(searchParams.get("from")!) : new Date(today.getTime() - 180 * 86400000);
  const to = searchParams.get("to") ? parseDateKey(searchParams.get("to")!) : today;

  const logs = await db.dailyLog.findMany({
    where: { userId, date: { gte: from, lte: to } },
    orderBy: { date: "asc" },
  });
  return ok(
    logs.map((l) => ({ date: dateKey(l.date), weightKg: l.weightKg, waterMl: l.waterMl }))
  );
});

/** POST /api/daily-log → 记录体重(可同步更新档案当前体重)或增减饮水 */
export const POST = handle(async (req: Request) => {
  const userId = await requireUserId();
  const rl = rateLimit(`daily-log:${userId}`, 120, 60 * 60_000);
  if (!rl.ok) return tooMany(rl.retryAfterSec, "记录过于频繁,请稍后再试");
  const body = dailyLogSchema.parse(await req.json());
  const date = parseDateKey(body.date);

  const existing = await db.dailyLog.findUnique({ where: { userId_date: { userId, date } } });

  const data: { weightKg?: number; waterMl?: number } = {};
  if (body.weightKg !== undefined) data.weightKg = body.weightKg;
  if (body.waterDeltaMl !== undefined) {
    data.waterMl = clamp((existing?.waterMl ?? 0) + body.waterDeltaMl, 0, 10000);
  }

  const log = await db.dailyLog.upsert({
    where: { userId_date: { userId, date } },
    create: {
      userId,
      date,
      weightKg: data.weightKg ?? null,
      waterMl: data.waterMl ?? 0,
    },
    update: data,
  });

  // 记录体重时同步档案「当前体重」,让热量目标随实际体重变化(MacroFactor 式动态调整)
  if (body.weightKg !== undefined) {
    await db.profile.updateMany({ where: { userId }, data: { weightKg: body.weightKg } });
  }

  return ok({ date: dateKey(log.date), weightKg: log.weightKg, waterMl: log.waterMl });
});
