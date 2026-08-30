import { redirect } from "next/navigation";
import { getUserIdOrNull } from "@/lib/api";
import { db } from "@/lib/db";
import { Nav } from "@/components/nav";
import { PlanClient } from "@/components/plan-client";
import { planWindow, targetsFor } from "@/lib/plan-service";
import { dateKey, parseDateKey, fromJson } from "@/lib/utils";
import type { MealDayData, PlanBlocks } from "@/types";

export const dynamic = "force-dynamic";

export default async function PlanPage() {
  const userId = await getUserIdOrNull();
  if (!userId) redirect("/login");
  const profile = await db.profile.findUnique({ where: { userId } });
  if (!profile) redirect("/onboarding");
  const user = await db.user.findUnique({ where: { id: userId } });

  const win = planWindow(profile);
  const [planDays, mealDays] = await Promise.all([
    db.planDay.findMany({ where: { userId, date: { gte: parseDateKey(win.from), lte: parseDateKey(win.to) } }, orderBy: { date: "asc" } }),
    db.mealDay.findMany({ where: { userId, date: { gte: parseDateKey(win.from), lte: parseDateKey(win.to) } }, orderBy: { date: "asc" } }),
  ]);
  const targets = targetsFor(profile);

  return (
    <div className="min-h-dvh">
      <Nav userName={user?.name} userEmail={user?.email} />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold">计划表 📅</h1>
            <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
              {win.from} 至 {win.to} · 共 {profile.durationDays} 天 · 每日目标 {targets.targetKcal} kcal
            </p>
          </div>
          <a href="/onboarding" className="btn-ghost text-xs">
            调整目标 / 偏好
          </a>
        </div>

        {planDays.length === 0 && mealDays.length === 0 ? (
          <div className="card flex flex-col items-center gap-3 p-10 text-center">
            <span className="text-3xl" aria-hidden>
              🗓️
            </span>
            <p className="font-medium">还没有计划</p>
            <p className="text-sm text-zinc-500">先完成问卷生成一个周期计划吧。</p>
            <a href="/onboarding" className="btn-primary">
              去生成计划
            </a>
          </div>
        ) : (
          <PlanClient
            from={win.from}
            to={win.to}
            durationDays={profile.durationDays}
            days={planDays.map((d) => ({
              date: dateKey(d.date),
              isTraining: d.isTraining,
              focus: d.focus,
              intensity: d.intensity,
              completed: d.completed,
              blocks: fromJson<PlanBlocks>(d.blocks),
            }))}
            meals={mealDays.map((m) => ({
              date: dateKey(m.date),
              targetKcal: m.targetKcal,
              slots: fromJson<MealDayData>(m.slots),
              completedSlots: m.completedSlots,
            }))}
            targets={{ targetKcal: targets.targetKcal }}
          />
        )}
      </main>
    </div>
  );
}
