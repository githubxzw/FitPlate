"use client";

// 数据中心:统计卡 + 体重趋势(EMA)+ 30 天热力图 + 周达标率 + 成就墙

import Link from "next/link";
import { Card, EmptyState, SectionTitle, Stat } from "@/components/ui";
import { WeightLine, WeekBars } from "@/components/charts";
import { cn, shortDate } from "@/lib/utils";

interface BadgeView {
  id: string;
  emoji: string;
  name: string;
  desc: string;
  unlocked: boolean;
  progress: number;
}

export interface StatsClientProps {
  stats: {
    streak: number;
    best: number;
    totalWorkouts: number;
    mealCheckinDays: number;
    weightLogDays: number;
    waterGoalDays: number;
    firstWeightKg: number;
    latestWeightKg: number | null;
    goalWeightKg: number;
  };
  weightSeries: { date: string; weight: number; trend: number }[];
  badges: BadgeView[];
  heat: { date: string; score: number }[];
  weeks: { weekStart: string; pct: number }[];
}

function heatColor(score: number): string {
  if (score <= 0) return "bg-zinc-100 dark:bg-zinc-800";
  if (score < 40) return "bg-brand-200 dark:bg-brand-900";
  if (score < 70) return "bg-brand-400/80 dark:bg-brand-700";
  if (score < 100) return "bg-brand-500 dark:bg-brand-600";
  return "bg-brand-600 dark:bg-brand-500";
}

export function StatsClient({ stats, weightSeries, badges, heat, weeks }: StatsClientProps) {
  const unlockedCount = badges.filter((b) => b.unlocked).length;
  const changed =
    stats.latestWeightKg !== null ? Math.round((stats.latestWeightKg - stats.firstWeightKg) * 10) / 10 : null;

  return (
    <div className="space-y-5">
      {/* 核心统计卡 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="card animate-fade-up flex items-center gap-3 p-4">
          <span className="text-3xl" aria-hidden>
            🔥
          </span>
          <div>
            <div className="tnum text-2xl font-bold leading-none">{stats.streak}</div>
            <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">连续达标(天)</div>
          </div>
        </div>
        <div className="card animate-fade-up flex items-center gap-3 p-4">
          <span className="text-3xl" aria-hidden>
            ⚡
          </span>
          <div>
            <div className="tnum text-2xl font-bold leading-none">{stats.best}</div>
            <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">最佳连胜(天)</div>
          </div>
        </div>
        <div className="card animate-fade-up flex items-center gap-3 p-4">
          <span className="text-3xl" aria-hidden>
            💪
          </span>
          <div>
            <div className="tnum text-2xl font-bold leading-none">{stats.totalWorkouts}</div>
            <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">累计训练(次)</div>
          </div>
        </div>
        <div className="card animate-fade-up flex items-center gap-3 p-4">
          <span className="text-3xl" aria-hidden>
            🍽️
          </span>
          <div>
            <div className="tnum text-2xl font-bold leading-none">{stats.mealCheckinDays}</div>
            <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">饮食打卡(天)</div>
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* 体重趋势 */}
        <Card className="animate-fade-up lg:col-span-2">
          <SectionTitle
            icon="⚖️"
            title="体重趋势"
            right={
              changed !== null ? (
                <span className={cn("tnum text-sm font-medium", changed <= 0 ? "text-brand-600 dark:text-brand-400" : "text-amber-600 dark:text-amber-400")}>
                  {changed <= 0 ? "−" : "+"}
                  {Math.abs(changed)} kg
                </span>
              ) : null
            }
          />
          {weightSeries.length >= 2 ? (
            <>
              <WeightLine data={weightSeries} />
              <p className="text-xs text-zinc-400">
                灰线为每日称重,绿线为 7 日趋势体重(指数移动平均)——趋势比单日波动更真实,参考 MacroFactor 的做法。
              </p>
            </>
          ) : (
            <EmptyState
              emoji="⚖️"
              title="体重记录还太少"
              desc="在「今日」页记录体重,至少 2 天后就能看到趋势曲线。建议每天清晨空腹称重。"
              action={
                <Link href="/today" className="btn-primary">
                  去记录体重
                </Link>
              }
            />
          )}
          <div className="mt-3 grid grid-cols-3 gap-2">
            <Stat label="起点体重" value={`${stats.firstWeightKg}`} sub="kg" />
            <Stat label="最新记录" value={stats.latestWeightKg !== null ? `${stats.latestWeightKg}` : "—"} sub="kg" />
            <Stat label="目标体重" value={`${stats.goalWeightKg}`} sub="kg" />
          </div>
        </Card>

        {/* 30 天热力图 */}
        <Card className="animate-fade-up">
          <SectionTitle icon="🗓️" title="近 30 天完成度" />
          <div className="grid grid-cols-10 gap-1.5">
            {heat.map((c) => (
              <div
                key={c.date}
                title={`${c.date} · 完成度 ${c.score}%`}
                className={cn("aspect-square rounded-md transition hover:scale-110", heatColor(c.score))}
              />
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-zinc-400">
            <span>30 天前</span>
            <span className="flex items-center gap-1">
              少
              <span className="inline-block h-3 w-3 rounded-sm bg-zinc-100 dark:bg-zinc-800" />
              <span className="inline-block h-3 w-3 rounded-sm bg-brand-200 dark:bg-brand-900" />
              <span className="inline-block h-3 w-3 rounded-sm bg-brand-400/80 dark:bg-brand-700" />
              <span className="inline-block h-3 w-3 rounded-sm bg-brand-500 dark:bg-brand-600" />
              <span className="inline-block h-3 w-3 rounded-sm bg-brand-600 dark:bg-brand-500" />
              多
            </span>
            <span>今天</span>
          </div>
          <p className="mt-3 text-xs text-zinc-400">
            达标 = 完成训练,或四餐完成 ≥3。深色格越多,习惯越稳固。
          </p>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* 周达标率 */}
        <Card className="animate-fade-up">
          <SectionTitle icon="📈" title="近 8 周达标率" />
          <WeekBars
            data={weeks.map((w) => ({
              day: shortDate(w.weekStart).replace("月", "/").replace("日", ""),
              value: w.pct,
              done: w.pct === 100,
            }))}
          />
          <p className="text-xs text-zinc-400">每周已结束天数中达标日的占比;100% 表示该周(截至今天)全达标。</p>
        </Card>

        {/* 成就墙 */}
        <Card className="animate-fade-up lg:col-span-2">
          <SectionTitle
            icon="🏆"
            title="成就墙"
            right={
              <span className="tnum text-xs text-zinc-400">
                已解锁 {unlockedCount} / {badges.length}
              </span>
            }
          />
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-5">
            {badges.map((b) => (
              <div
                key={b.id}
                className={cn(
                  "rounded-xl border p-3 text-center transition",
                  b.unlocked
                    ? "border-brand-300 bg-gradient-to-b from-brand-50 to-white shadow-card dark:border-brand-800 dark:from-brand-900/40 dark:to-zinc-900"
                    : "border-zinc-200 opacity-70 grayscale dark:border-zinc-800"
                )}
              >
                <div className={cn("text-3xl", b.unlocked && "animate-float")} aria-hidden>
                  {b.emoji}
                </div>
                <div className="mt-1 text-xs font-semibold">{b.name}</div>
                <div className="mt-0.5 text-[11px] leading-tight text-zinc-400">{b.desc}</div>
                {!b.unlocked && (
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                    <div className="h-full rounded-full bg-brand-400" style={{ width: `${b.progress}%` }} />
                  </div>
                )}
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-zinc-400">
            徽章在解锁时会在首页弹窗庆祝;保持连续打卡,点亮更多成就。饮水达标 {stats.waterGoalDays} 天 · 体重记录 {stats.weightLogDays} 天。
          </p>
        </Card>
      </div>
    </div>
  );
}
