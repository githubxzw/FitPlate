import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { handle, ok, ApiError, fail } from "@/lib/api";
import { registerSchema } from "@/lib/validation";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";

export const POST = handle(async (req: Request) => {
  // 注册开关:REGISTRATION_ENABLED=false 时整体关闭
  if (process.env.REGISTRATION_ENABLED === "false") {
    throw new ApiError(403, "注册暂未开放,请联系管理员");
  }

  // 同一 IP 每小时最多 3 次注册(防机器人批量灌库)
  const rl = rateLimit(`register:${clientIp(req)}`, 3, 60 * 60_000);
  if (!rl.ok) {
    return fail(429, "注册过于频繁,请稍后再试", { retryAfterSec: rl.retryAfterSec });
  }

  const body = registerSchema.parse(await req.json());

  // 邀请码:配置了 INVITE_CODE 后必填
  const invite = process.env.INVITE_CODE?.trim();
  if (invite && body.inviteCode !== invite) {
    throw new ApiError(403, "邀请码不正确");
  }

  const email = body.email.trim().toLowerCase();
  const exists = await db.user.findUnique({ where: { email } });
  if (exists) throw new ApiError(409, "该邮箱已注册,请直接登录");

  const user = await db.user.create({
    data: { email, passwordHash: hashPassword(body.password), name: body.name },
    select: { id: true, email: true, name: true },
  });
  audit("register", { userId: user.id, email });
  return ok(user, { status: 201 });
});
