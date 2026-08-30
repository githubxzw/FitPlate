import { db } from "@/lib/db";
import { handle, ok, ApiError, requireUserId } from "@/lib/api";
import { profileSchema } from "@/lib/validation";
import { profileToInput, targetsFor } from "@/lib/plan-service";
import { parseDateKey, todayKey } from "@/lib/utils";
import { DEFAULT_GYM_EQUIPMENT, DEFAULT_HOME_EQUIPMENT } from "@/lib/constants";

/** GET /api/profile → 当前档案 + 推导目标 */
export const GET = handle(async () => {
  const userId = await requireUserId();
  const profile = await db.profile.findUnique({ where: { userId } });
  if (!profile) throw new ApiError(404, "还没有档案,请先完成问卷");
  return ok({ profile, targets: targetsFor(profile), input: profileToInput(profile) });
});

/** PUT /api/profile → 保存问卷(新建或更新),并按需重置计划起始日 */
export const PUT = handle(async (req: Request) => {
  const userId = await requireUserId();
  const body = profileSchema.parse(await req.json());
  const equipment = body.equipment.length > 0 ? body.equipment : body.place === "gym" ? DEFAULT_GYM_EQUIPMENT : DEFAULT_HOME_EQUIPMENT;

  const existing = await db.profile.findUnique({ where: { userId } });
  const data = {
    ...body,
    bodyFatPct: body.bodyFatPct ?? null,
    equipment,
    onboardedAt: existing?.onboardedAt ?? new Date(),
  };

  const profile = await db.profile.upsert({
    where: { userId },
    create: { userId, ...data, startDate: parseDateKey(todayKey()) },
    update: { ...data },
  });

  // 档案变化后,起始日重置为今天(完整重新生成由前端调用 /api/plan、/api/meals)
  if (existing) {
    await db.profile.update({ where: { userId }, data: { startDate: parseDateKey(todayKey()) } });
  }
  return ok({ profile, targets: targetsFor(profile) });
});
