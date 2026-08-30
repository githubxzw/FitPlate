import { redirect } from "next/navigation";
import { getUserIdOrNull } from "@/lib/api";
import { db } from "@/lib/db";
import { OnboardingForm } from "@/components/onboarding-form";
import { Nav } from "@/components/nav";
import type { ProfileFormState } from "@/components/onboarding-form";

export default async function OnboardingPage() {
  const userId = await getUserIdOrNull();
  if (!userId) redirect("/login");
  const profile = await db.profile.findUnique({ where: { userId } });
  const user = await db.user.findUnique({ where: { id: userId } });

  const initial: Partial<ProfileFormState> | undefined = profile
    ? {
        sex: profile.sex as ProfileFormState["sex"],
        age: String(profile.age),
        heightCm: String(profile.heightCm),
        weightKg: String(profile.weightKg),
        bodyFatPct: profile.bodyFatPct ? String(profile.bodyFatPct) : "",
        goalWeightKg: String(profile.goalWeightKg),
        durationDays: profile.durationDays as 7 | 14 | 30,
        experience: profile.experience as ProfileFormState["experience"],
        trainingDaysPerWeek: profile.trainingDaysPerWeek,
        place: profile.place as ProfileFormState["place"],
        equipment: profile.equipment,
        dietPrefs: profile.dietPrefs,
        allergies: profile.allergies,
        disliked: profile.disliked,
        budgetYuan: profile.budgetYuan,
        cookMinutes: profile.cookMinutes,
        flags: profile.flags,
      }
    : undefined;

  return (
    <div className="min-h-dvh">
      <Nav userName={user?.name} userEmail={user?.email} />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="mb-1 text-2xl font-bold">{profile ? "编辑资料" : "先认识一下你"}</h1>
        <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
          {profile ? "保存后将从今天开始重新生成计划(已打卡的日期会保留)。" : "3 步填写基本信息与偏好,系统会生成每日训练与减脂餐计划。"}
        </p>
        <OnboardingForm initial={initial} />
      </main>
    </div>
  );
}
