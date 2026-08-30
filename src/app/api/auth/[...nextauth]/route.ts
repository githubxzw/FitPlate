import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { tooMany } from "@/lib/api";

const handler = NextAuth(authOptions);

/** 登录回调限流:同一 IP+邮箱 15 分钟内最多 10 次(防暴力破解/撞库) */
async function post(req: Request, ctx: { params: Promise<{ nextauth: string[] }> }) {
  const url = new URL(req.url);
  if (url.pathname.endsWith("/callback/credentials")) {
    const ip = clientIp(req);
    let email = "unknown";
    try {
      email = new URLSearchParams(await req.clone().text()).get("email")?.trim().toLowerCase() ?? "unknown";
    } catch {
      // 读不到 body 不影响主流程
    }
    const rl = rateLimit(`login:${ip}:${email}`, 10, 15 * 60_000);
    if (!rl.ok) {
      return tooMany(rl.retryAfterSec, `登录尝试过于频繁,请 ${Math.max(1, Math.ceil(rl.retryAfterSec / 60))} 分钟后再试`);
    }
  }
  return handler(req, ctx);
}

export { handler as GET, post as POST };
