import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { handle, ok, ApiError } from "@/lib/api";
import { registerSchema } from "@/lib/validation";

export const POST = handle(async (req: Request) => {
  const body = registerSchema.parse(await req.json());
  const email = body.email.trim().toLowerCase();

  const exists = await db.user.findUnique({ where: { email } });
  if (exists) throw new ApiError(409, "该邮箱已注册,请直接登录");

  const user = await db.user.create({
    data: { email, passwordHash: hashPassword(body.password), name: body.name },
    select: { id: true, email: true, name: true },
  });
  return ok(user, { status: 201 });
});
