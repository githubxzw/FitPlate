import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "./db";
import { verifyPassword } from "./password";
import { loginGuard } from "./rate-limit";
import { audit } from "./audit";

declare module "next-auth" {
  interface Session {
    user: { id?: string; name?: string | null; email?: string | null };
  }
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "邮箱登录",
      credentials: {
        email: { label: "邮箱", type: "email" },
        password: { label: "密码", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase();
        const password = credentials?.password;
        if (!email || !password) return null;

        // 连续失败锁定的账号,一律按普通失败处理(避免暴露账号状态)
        if (loginGuard.isLocked(email)) {
          audit("login_blocked", { email });
          return null;
        }

        const user = await db.user.findUnique({ where: { email } });
        if (!user || !verifyPassword(password, user.passwordHash)) {
          loginGuard.recordFail(email);
          audit("login_fail", { email });
          return null;
        }

        loginGuard.recordSuccess(email);
        audit("login", { userId: user.id, email });
        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.uid = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user) session.user.id = token.uid as string | undefined;
      return session;
    },
  },
};
