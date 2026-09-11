import { redirect } from "next/navigation";
import { getUserIdOrNull } from "@/lib/api";
import { db } from "@/lib/db";
import { Nav } from "@/components/nav";
import { StatsClient } from "@/components/stats-client";
import { getStatsSummary } from "@/lib/stats-service";
import { heatmapData, weeklyAdherence } from "@/lib/stats";

export const dynamic = "force-dynamic";

export default async function StatsPage() {
  const userId = await getUserIdOrNull();
  if (!userId) redirect("/login");
  const profile = await db.profile.findUnique({ where: { userId } });
  if (!profile) redirect("/onboarding");
  const user = await db.user.findUnique({ where: { id: userId } });

  const summary = await getStatsSummary(userId, {
    weightKg: profile.weightKg,
    goalWeightKg: profile.goalWeightKg,
  });

  return (
    <div className="min-h-dvh">
      <Nav userName={user?.name} userEmail={user?.email} />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-5 animate-fade-up">
          <h1 className="text-2xl font-bold">数据中心 📊</h1>
          <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
            你的努力都看得见:体重趋势、完成度热力图与成就徽章(数据仅供参考)。
          </p>
        </div>
        <StatsClient
          stats={{
            streak: summary.streak,
            best: summary.best,
            totalWorkouts: summary.totalWorkouts,
            mealCheckinDays: summary.mealCheckinDays,
            weightLogDays: summary.weightLogDays,
            waterGoalDays: summary.waterGoalDays,
            firstWeightKg: summary.firstWeightKg,
            latestWeightKg: summary.latestWeightKg,
            goalWeightKg: profile.goalWeightKg,
          }}
          weightSeries={summary.weightSeries}
          badges={summary.badges}
          heat={heatmapData(summary.adherence, summary.today, 30).map((h) => ({ date: h.date, score: h.score }))}
          weeks={weeklyAdherence(summary.adherence, summary.today, 8)}
        />
        <p className="print-footer">FitPlate · 数据统计仅供参考,不构成医疗或营养治疗建议。</p>
      </main>
    </div>
  );
}
