import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getUserIdOrNull } from "@/lib/api";
import { db } from "@/lib/db";
import { Nav } from "@/components/nav";
import { SmartImage } from "@/components/smart-image";
import { RecipeActions } from "@/components/recipe-actions";
import { Badge, Card, Disclaimer, SectionTitle, Stat } from "@/components/ui";
import { MEAL_SLOT_LABEL, DIFFICULTY_LABEL, shortDate, weekdayLabel, fromJson } from "@/lib/utils";
import type { MealDayData, MealSlotType, SourceRef } from "@/types";

export const dynamic = "force-dynamic";

const SLOTS: MealSlotType[] = ["breakfast", "lunch", "dinner", "snack"];

export default async function RecipePage({ params }: { params: Promise<{ date: string; slot: string }> }) {
  const { date, slot } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !SLOTS.includes(slot as MealSlotType)) notFound();

  const userId = await getUserIdOrNull();
  if (!userId) redirect("/login");
  const profile = await db.profile.findUnique({ where: { userId } });
  if (!profile) redirect("/onboarding");
  const user = await db.user.findUnique({ where: { id: userId } });

  const mealDay = await db.mealDay.findUnique({ where: { userId_date: { userId, date: new Date(date + "T00:00:00.000Z") } } });
  if (!mealDay) notFound();

  const m = (fromJson<MealDayData>(mealDay.slots))[slot as MealSlotType];
  if (!m) notFound();

  const done = mealDay.completedSlots.includes(slot);
  const sources = (fromJson<SourceRef[]>(mealDay.sources)) ?? [];

  return (
    <div className="min-h-dvh">
      <Nav userName={user?.name} userEmail={user?.email} />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <div className="mb-4 flex items-center justify-between">
          <Link href="/plan" className="btn-ghost text-sm">
            ← 返回计划表
          </Link>
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            {shortDate(date)} {weekdayLabel(date)} · {MEAL_SLOT_LABEL[slot as MealSlotType]}
            {done ? " · 已打卡 ✓" : ""}
          </span>
        </div>

        {/* 头图 */}
        <div className="card overflow-hidden p-0">
          <div className="relative h-56 w-full sm:h-72">
            <SmartImage seed={m.recipeId} emoji={m.emoji} label={m.name} query={m.name} className="absolute inset-0" />
          </div>
          <div className="p-5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold">{m.name}</h1>
              <Badge tone="amber">⏱ {m.minutes} 分钟</Badge>
              <Badge tone="sky">难度 {DIFFICULTY_LABEL[m.difficulty]}</Badge>
              <Badge tone="zinc">约 ¥{m.costYuan}</Badge>
              {m.tags.map((t) => (
                <Badge key={t} tone="emerald">
                  {t}
                </Badge>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-4 gap-2">
              <Stat label="热量" value={m.kcal} sub="kcal" />
              <Stat label="蛋白质" value={`${m.protein}g`} />
              <Stat label="碳水" value={`${m.carbs}g`} />
              <Stat label="脂肪" value={`${m.fat}g`} />
            </div>
            <div className="mt-4">
              <RecipeActions date={date} slot={slot} scale={m.scale} />
              <p className="mt-2 text-xs text-zinc-400">
                份量比例 {m.scale}×(系统按当日热量目标自动缩放,可手动微调 0.5–2.0 倍)。
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          {/* 食材 */}
          <Card>
            <SectionTitle icon="🧺" title="食材清单" />
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-left text-xs text-zinc-400 dark:border-zinc-800">
                  <th className="py-1.5">食材</th>
                  <th className="py-1.5">用量</th>
                </tr>
              </thead>
              <tbody>
                {m.ingredients.map((i) => (
                  <tr key={i.name} className="border-b border-zinc-100 last:border-0 dark:border-zinc-800/60">
                    <td className="py-2">
                      {i.name}
                      {i.note && <span className="ml-1 text-xs text-zinc-400">({i.note})</span>}
                    </td>
                    <td className="py-2 tabular-nums text-zinc-600 dark:text-zinc-300">{i.grams} g</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* 步骤 */}
          <Card>
            <SectionTitle icon="👩‍🍳" title="做法步骤" />
            <ol className="space-y-2.5">
              {m.steps.map((s, i) => (
                <li key={i} className="flex gap-2.5 text-sm leading-relaxed">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700 dark:bg-brand-900/60 dark:text-brand-300">
                    {i + 1}
                  </span>
                  {s}
                </li>
              ))}
            </ol>
          </Card>
        </div>

        {/* 替代食材 */}
        <Card className="mt-5">
          <SectionTitle icon="🔄" title="替代食材" />
          <div className="space-y-2 text-sm">
            {m.substitutes.map((s) => (
              <div key={s.for} className="flex flex-wrap items-center gap-2">
                <Badge tone="zinc">{s.for}</Badge>
                <span className="text-zinc-400">→</span>
                <span>{s.options.join("、")}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-zinc-400">换食材后营养会略有变化,可回到「今日计划」调整份量。</p>
        </Card>

        {/* 来源与免责 */}
        {sources.length > 0 && (
          <Card className="mt-5">
            <SectionTitle icon="📚" title="营养参考来源" />
            <ul className="space-y-2 text-xs">
              {sources.map((s) => (
                <li key={s.url}>
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="font-medium text-brand-700 hover:underline dark:text-brand-400">
                    {s.title}
                  </a>
                  <span className="ml-2 text-zinc-400">
                    {s.source} · 访问于 {s.accessedAt.slice(0, 10)}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        <Disclaimer className="mt-5" />
        <p className="print-footer">FitPlate · 热量与营养数据为参考估算,不构成医疗或营养治疗建议。</p>
      </main>
    </div>
  );
}
