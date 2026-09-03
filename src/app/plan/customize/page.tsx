import { redirect } from "next/navigation";
import { getUserIdOrNull } from "@/lib/api";
import { db } from "@/lib/db";
import { Nav } from "@/components/nav";
import { CustomWeekClient } from "@/components/custom-week";
import { profileToInput } from "@/lib/plan-service";
import { WEEK_PLAN } from "@/lib/workout-engine";
import { dateKey, fromJson, parseDateKey } from "@/lib/utils";
import type { WeekDayDef } from "@/types";

export const dynamic = "force-dynamic";

/** 未设置过自定义模板时,用当前内置周计划预填(便于在现状基础上改) */
function builtinWeekAsDefs(experience: string, daysPerWeek: number): WeekDayDef[] {
  const week = WEEK_PLAN[`${experience}-${Math.min(7, Math.max(1, daysPerWeek))}`] ?? WEEK_PLAN["beginner-3"];
  return week.map((t) => (t === "rest" ? { type: "rest" } : { type: "template", templateId: t }));
}

export default async function CustomizePlanPage() {
  const userId = await getUserIdOrNull();
  if (!userId) redirect("/login");
  const profile = await db.profile.findUnique({ where: { userId } });
  if (!profile) redirect("/onboarding");
  const user = await db.user.findUnique({ where: { id: userId } });

  const p = profileToInput(profile);
  const stored = profile.customWeek ? fromJson<WeekDayDef[]>(profile.customWeek) : null;
  const initialWeek = stored && Array.isArray(stored) && stored.length === 7 ? stored : builtinWeekAsDefs(profile.experience, profile.trainingDaysPerWeek);

  return (
    <div className="min-h-dvh">
      <Nav userName={user?.name} userEmail={user?.email} />
      <main className="mx-auto max-w-4xl px-4 py-6">
        <div className="mb-5">
          <h1 className="text-2xl font-bold">自定义每周训练安排</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            决定每天练什么、哪天休息;也可以把某一天完全交给自己排动作。
          </p>
        </div>
        <CustomWeekClient
          initialWeek={initialWeek}
          initialEnabled={profile.customWeekEnabled}
          equipment={p.equipment}
          experience={p.experience}
          durationDays={profile.durationDays}
          startDate={dateKey(profile.startDate)}
        />
      </main>
    </div>
  );
}
