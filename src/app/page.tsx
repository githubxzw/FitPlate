import { redirect } from "next/navigation";
import { getUserIdOrNull } from "@/lib/api";
import { db } from "@/lib/db";

// 首页:以「今日计划」为核心 —— 已登录直接进入 /today,未登录去 /login
export default async function Home() {
  const userId = await getUserIdOrNull();
  if (!userId) redirect("/login");
  const profile = await db.profile.findUnique({ where: { userId } });
  redirect(profile ? "/today" : "/onboarding");
}
