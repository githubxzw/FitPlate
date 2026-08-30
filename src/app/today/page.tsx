import { redirect } from "next/navigation";
import { getUserIdOrNull } from "@/lib/api";
import { db } from "@/lib/db";
import { Nav } from "@/components/nav";
import { TodayClient } from "@/components/today-client";
import { targetsFor, profileToInput } from "@/lib/plan-service";
import { aiEnabled } from "@/lib/ai";
import { dateKey, greeting, parseDateKey, todayKey, weekdayLabel, fromJson } from "@/lib/utils";
import type { MealDayData, PlanBlocks, SourceRef } from "@/types";

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const userId = await getUserIdOrNull();
  if (!userId) redirect("/login");

  const profile = await db.profile.findUnique({ where: { userId } });
  if (!profile) redirect("/onboarding");
  const user = await db.user.findUnique({ where: { id: userId } });

  const today = todayKey();
  const [planDay, mealDay] = await Promise.all([
    db.planDay.findUnique({ where: { userId_date: { userId, date: parseDateKey(today) } } }),
    db.mealDay.findUnique({ where: { userId_date: { userId, date: parseDateKey(today) } } }),
  ]);

  const targets = targetsFor(profile);

  return (
    <div className="min-h-dvh">
      <Nav userName={user?.name} userEmail={user?.email} />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold">
              {greeting()},{user?.name ?? "朋友"} 👋
            </h1>
            <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
              今天是 {today} {weekdayLabel(today)}
              {planDay ? ` · 计划第 ${Math.floor((parseDateKey(today).getTime() - parseDateKey(dateKey(profile.startDate)).getTime()) / 86400000) + 1} 天` : ""}
            </p>
          </div>
          <a href="/onboarding" className="btn-ghost text-xs">
            编辑资料 / 偏好
          </a>
        </div>

        <TodayClient
          date={today}
          weekday={weekdayLabel(today)}
          greeting={greeting()}
          userName={user?.name}
          targets={{
            targetKcal: targets.targetKcal,
            protein: targets.protein,
            carbs: targets.carbs,
            fat: targets.fat,
            weeklyChangeKg: targets.weeklyChangeKg,
          }}
          weightKg={profile.weightKg}
          goalWeightKg={profile.goalWeightKg}
          profileInput={profileToInput(profile)}
          plan={
            planDay
              ? {
                  focus: planDay.focus,
                  isTraining: planDay.isTraining,
                  intensity: planDay.intensity,
                  completed: planDay.completed,
                  blocks: fromJson<PlanBlocks>(planDay.blocks),
                  aiTips: (fromJson<string[]>(planDay.aiTips)) ?? [],
                  sources: (fromJson<SourceRef[]>(planDay.sources)) ?? [],
                }
              : null
          }
          meals={
            mealDay
              ? {
                  slots: fromJson<MealDayData>(mealDay.slots),
                  completedSlots: mealDay.completedSlots,
                  sources: (fromJson<SourceRef[]>(mealDay.sources)) ?? [],
                }
              : null
          }
          aiEnabled={aiEnabled()}
        />

        {targets.warnings.length > 0 && (
          <div className="mt-5 space-y-2">
            {targets.warnings.map((w, i) => (
              <p key={i} className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
                ⚠️ {w}
              </p>
            ))}
          </div>
        )}

        <p className="print-footer">FitPlate · 热量与运动建议仅供参考,不构成医疗或营养治疗建议。</p>
      </main>
    </div>
  );
}
