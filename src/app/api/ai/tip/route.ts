import { db } from "@/lib/db";
import { handle, ok, ApiError, requireUserId } from "@/lib/api";
import { ensureAiTips } from "@/lib/plan-service";
import { AI_DISCLAIMER } from "@/lib/constants";

/** GET /api/ai/tip?date=YYYY-MM-DD → 当日教练建议(AI 或规则引擎,含缓存) */
export const GET = handle(async (req: Request) => {
  const userId = await requireUserId();
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  if (!date) throw new ApiError(422, "缺少 date 参数");

  const profile = await db.profile.findUnique({ where: { userId } });
  if (!profile) throw new ApiError(404, "还没有档案,请先完成问卷");

  const tips = await ensureAiTips(userId, profile, date);
  return ok({ date, tips, disclaimer: AI_DISCLAIMER });
});
