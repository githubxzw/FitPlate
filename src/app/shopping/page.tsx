import { redirect } from "next/navigation";
import { getUserIdOrNull } from "@/lib/api";
import { db } from "@/lib/db";
import { Nav } from "@/components/nav";
import { ShoppingClient } from "@/components/shopping-client";
import { buildShoppingList } from "@/lib/meal-engine";
import { addDays, dateKey, parseDateKey, todayKey, fromJson } from "@/lib/utils";
import type { MealDayData } from "@/types";

export const dynamic = "force-dynamic";

export default async function ShoppingPage() {
  const userId = await getUserIdOrNull();
  if (!userId) redirect("/login");
  const profile = await db.profile.findUnique({ where: { userId } });
  if (!profile) redirect("/onboarding");
  const user = await db.user.findUnique({ where: { id: userId } });

  const from = dateKey(profile.startDate);
  const to = dateKey(addDays(parseDateKey(from), profile.durationDays - 1));
  const today = todayKey();

  const rows = await db.mealDay.findMany({
    where: { userId, date: { gte: parseDateKey(from), lte: parseDateKey(to) } },
    orderBy: { date: "asc" },
  });
  const items = buildShoppingList(rows.map((r) => ({ data: fromJson<MealDayData>(r.slots) })));

  const weekEnd = dateKey(addDays(parseDateKey(today), 6));
  const presets = [
    { label: "未来 3 天", from: today, to: dateKey(addDays(parseDateKey(today), 2)) },
    { label: "未来 7 天", from: today, to: weekEnd },
    { label: "整个周期", from, to },
  ];

  return (
    <div className="min-h-dvh">
      <Nav userName={user?.name} userEmail={user?.email} />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-5">
          <h1 className="text-2xl font-bold">购物清单 🛒</h1>
          <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">按当前周期汇总,买之前勾掉已有的食材。</p>
        </div>
        <ShoppingClient items={items} from={from} to={to} presets={presets} />
      </main>
    </div>
  );
}
