// API 统一响应与错误处理
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}

export function fail(status: number, message: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, error: message, ...extra }, { status });
}

/** 包装路由处理器:统一捕获 ApiError / ZodError / 未知错误 */
export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (e) {
      if (e instanceof ApiError) return fail(e.status, e.message);
      if (e instanceof ZodError) {
        return fail(422, "输入校验未通过", {
          issues: e.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
        });
      }
      console.error("[api] unexpected error:", e);
      const message = e instanceof Error ? e.message : "服务器内部错误";
      return fail(500, process.env.NODE_ENV === "production" ? "服务器内部错误,请稍后重试" : message);
    }
  };
}

/** 要求已登录,返回 userId */
export async function requireUserId(): Promise<string> {
  const session = await getServerSession(authOptions);
  const id = session?.user?.id;
  if (!id) throw new ApiError(401, "请先登录");
  return id;
}

/** 服务端组件用的轻量会话读取(不抛错) */
export async function getUserIdOrNull(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return session?.user?.id ?? null;
}
