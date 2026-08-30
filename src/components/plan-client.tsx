"use client";

// 计划表:周视图(训练表 + 饮食表)/ 月历视图;支持打印导出 PDF、CSV 下载

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Badge, Card, Disclaimer, SectionTitle, Spinner, Toast } from "@/components/ui";
import { WeekBars } from "@/components/charts";
import { MEAL_SLOT_LABEL } from "@/lib/utils";
import { cn, addDays, parseDateKey, shortDate, weekdayLabel } from "@/lib/utils";
import type { MealDayData, MealSlotType, PlanBlocks } from "@/types";

export interface PlanDayRow {
  date: string;
  isTraining: boolean;
  focus: string;
  intensity: string;
  completed: boolean;
  blocks: PlanBlocks;
}

export interface MealDayRow {
  date: string;
  targetKcal: number;
  slots: MealDayData;
  completedSlots: string[];
}

export interface PlanClientProps {
  from: string;
  to: string;
  durationDays: number;
  days: PlanDayRow[];
  meals: MealDayRow[];
  targets: { targetKcal: number };
}

const KIND_LABEL: Record<string, string> = { warmup: "热身", strength: "力量", cardio: "有氧", stretch: "拉伸" };

function summarizeDay(blocks: PlanBlocks): { strength: string; cardio: string } {
  const strength = blocks.strength
    .map((s) => `${s.name} ${s.sets}×${s.unit === "reps" ? `${s.repsOrDuration}次` : s.unit === "seconds" ? `${s.repsOrDuration}s` : `${s.repsOrDuration}分`}`)
    .join(" · ");
  const cardio = blocks.cardio.map((c) => `${c.name} ${c.repsOrDuration}分钟`).join(" · ");
  return { strength, cardio };
}

export function PlanClient(props: PlanClientProps) {
  const router = useRouter();
  const [view, setView] = useState<"week" | "month">("week");
  const [weekStart, setWeekStart] = useState(props.from);
  const [toast, setToast] = useState<string | null>(null);

  const weekDates = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(parseDateKey(weekStart), i).toISOString().slice(0, 10)), [weekStart]);
  const weekDays = props.days.filter((d) => weekDates.includes(d.date));
  const weekMeals = props.meals.filter((m) => weekDates.includes(m.date));

  // 周完成度:训练+4餐 中已完成的比例
  const weekBars = weekDates.map((d) => {
    const p = props.days.find((x) => x.date === d);
    const m = props.meals.find((x) => x.date === d);
    const total = p && m ? 5 : p || m ? 1 : 0;
    const done = (p?.completed ? 1 : 0) + (m ? (["breakfast", "lunch", "dinner", "snack"] as MealSlotType[]).filter((s) => m.completedSlots.includes(s)).length : 0);
    return {
      day: weekdayLabel(d).replace("周", ""),
      value: total === 0 ? 0 : Math.round((done / total) * 100),
      done: total > 0 && done === total,
    };
  });

  const monthCells = useMemo(
    () => Array.from({ length: props.durationDays }, (_, i) => addDays(parseDateKey(props.from), i).toISOString().slice(0, 10)),
    [props.from, props.durationDays]
  );

  function exportCsv(type: "workouts" | "meals" | "shopping") {
    const params = new URLSearchParams({ type, from: props.from, to: props.to });
    window.location.href = `/api/export/csv?${params.toString()}`;
    setToast(`正在下载 ${type === "workouts" ? "训练计划" : type === "meals" ? "饮食规划" : "购物清单"} CSV…`);
  }

  return (
    <div className="space-y-5">
      {/* 工具栏 */}
      <div className="no-print flex flex-wrap items-center gap-2">
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800">
          {(["week", "month"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn("rounded-lg px-3 py-1.5 text-sm", view === v ? "bg-white font-medium shadow dark:bg-zinc-900" : "text-zinc-500")}
            >
              {v === "week" ? "周视图" : "月历"}
            </button>
          ))}
        </div>
        {view === "week" && (
          <div className="flex items-center gap-1">
            <button className="btn-ghost px-2.5 py-1.5" onClick={() => setWeekStart(addDays(parseDateKey(weekStart), -7).toISOString().slice(0, 10))}>
              ←
            </button>
            <span className="min-w-36 text-center text-sm">
              {shortDate(weekDates[0])} – {shortDate(weekDates[6])}
            </span>
            <button className="btn-ghost px-2.5 py-1.5" onClick={() => setWeekStart(addDays(parseDateKey(weekStart), 7).toISOString().slice(0, 10))}>
              →
            </button>
          </div>
        )}
        <div className="ml-auto flex flex-wrap gap-2">
          <button className="btn-ghost text-xs" onClick={() => window.print()}>
            🖨️ 打印 / 导出 PDF
          </button>
          <button className="btn-ghost text-xs" onClick={() => exportCsv("workouts")}>
            ⬇️ 训练 CSV
          </button>
          <button className="btn-ghost text-xs" onClick={() => exportCsv("meals")}>
            ⬇️ 饮食 CSV
          </button>
          <button className="btn-ghost text-xs" onClick={() => exportCsv("shopping")}>
            ⬇️ 购物清单 CSV
          </button>
        </div>
      </div>

      {view === "week" ? (
        <>
          <Card>
            <SectionTitle icon="💪" title={`健身计划表(${shortDate(weekDates[0])} – ${shortDate(weekDates[6])})`} />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-left text-xs text-zinc-400 dark:border-zinc-800">
                    <th className="whitespace-nowrap px-2 py-2">日期</th>
                    <th className="px-2 py-2">重点</th>
                    <th className="px-2 py-2">力量动作</th>
                    <th className="px-2 py-2">有氧</th>
                    <th className="px-2 py-2">打卡</th>
                  </tr>
                </thead>
                <tbody>
                  {weekDays.map((d) => {
                    const s = summarizeDay(d.blocks);
                    return (
                      <tr key={d.date} className={cn("border-b border-zinc-100 dark:border-zinc-800/60", d.date === new Date().toISOString().slice(0, 10) && "bg-brand-50/50 dark:bg-brand-900/10")}>
                        <td className="whitespace-nowrap px-2 py-2.5">
                          <div className="font-medium">{shortDate(d.date)}</div>
                          <div className="text-xs text-zinc-400">{weekdayLabel(d.date)}</div>
                        </td>
                        <td className="px-2 py-2.5">
                          <Badge tone={d.isTraining ? "emerald" : "zinc"}>{d.focus}</Badge>
                        </td>
                        <td className="px-2 py-2.5 text-xs leading-relaxed text-zinc-600 dark:text-zinc-300">{s.strength || "—"}</td>
                        <td className="px-2 py-2.5 text-xs text-zinc-600 dark:text-zinc-300">{s.cardio || "—"}</td>
                        <td className="px-2 py-2.5">{d.completed ? <span className="text-brand-600">✓ 已完成</span> : <span className="text-zinc-300">○</span>}</td>
                      </tr>
                    );
                  })}
                  {weekDays.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-2 py-8 text-center text-sm text-zinc-400">
                        本周暂无训练记录
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          <Card>
            <SectionTitle icon="🍽️" title="饮食规划表" />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-left text-xs text-zinc-400 dark:border-zinc-800">
                    <th className="whitespace-nowrap px-2 py-2">日期</th>
                    {(["breakfast", "lunch", "dinner", "snack"] as MealSlotType[]).map((s) => (
                      <th key={s} className="px-2 py-2">
                        {MEAL_SLOT_LABEL[s]}
                      </th>
                    ))}
                    <th className="px-2 py-2">合计 kcal</th>
                  </tr>
                </thead>
                <tbody>
                  {weekMeals.map((m) => {
                    const total = Object.values(m.slots).reduce((s, x) => s + x.kcal, 0);
                    return (
                      <tr key={m.date} className={cn("border-b border-zinc-100 dark:border-zinc-800/60", m.date === new Date().toISOString().slice(0, 10) && "bg-brand-50/50 dark:bg-brand-900/10")}>
                        <td className="whitespace-nowrap px-2 py-2.5">
                          <div className="font-medium">{shortDate(m.date)}</div>
                          <div className="text-xs text-zinc-400">{weekdayLabel(m.date)}</div>
                        </td>
                        {(["breakfast", "lunch", "dinner", "snack"] as MealSlotType[]).map((s) => {
                          const slot = m.slots[s];
                          const done = m.completedSlots.includes(s);
                          return (
                            <td key={s} className="px-2 py-2.5 text-xs">
                              {slot ? (
                                <Link href={`/meal/${m.date}/${s}`} className={cn("hover:text-brand-600", done && "text-brand-600 dark:text-brand-400")}>
                                  {done ? "✓ " : ""}
                                  {slot.name}
                                  <span className="ml-1 text-zinc-400">{slot.kcal}</span>
                                </Link>
                              ) : (
                                "—"
                              )}
                            </td>
                          );
                        })}
                        <td className="px-2 py-2.5 text-xs font-medium">{total}</td>
                      </tr>
                    );
                  })}
                  {weekMeals.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-2 py-8 text-center text-sm text-zinc-400">
                        本周暂无饮食记录
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="no-print">
            <SectionTitle icon="📈" title="本周完成度" />
            <WeekBars data={weekBars} />
          </Card>
        </>
      ) : (
        <Card>
          <SectionTitle icon="🗓️" title={`计划月历(${shortDate(props.from)} – ${shortDate(props.to)})`} />
          <div className="grid grid-cols-7 gap-1.5 text-center">
            {["一", "二", "三", "四", "五", "六", "日"].map((w) => (
              <div key={w} className="text-xs text-zinc-400">
                周{w}
              </div>
            ))}
            {/* 首行留空 */}
            {Array.from({ length: (parseDateKey(props.from).getUTCDay() + 6) % 7 }).map((_, i) => (
              <div key={`pad-${i}`} />
            ))}
            {monthCells.map((d) => {
              const p = props.days.find((x) => x.date === d);
              const m = props.meals.find((x) => x.date === d);
              const mealDone = m ? (["breakfast", "lunch", "dinner", "snack"] as MealSlotType[]).filter((s) => m.completedSlots.includes(s)).length : 0;
              return (
                <div
                  key={d}
                  className={cn(
                    "rounded-xl border p-1.5 text-left text-xs transition",
                    d === new Date().toISOString().slice(0, 10) ? "border-brand-500 ring-1 ring-brand-500/40" : "border-zinc-200 dark:border-zinc-800",
                    p && !p.isTraining && "bg-zinc-50 dark:bg-zinc-900"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{parseDateKey(d).getUTCDate()}</span>
                    {p?.completed && <span className="text-brand-600">✓</span>}
                  </div>
                  <div className="mt-0.5 flex items-center gap-1">
                    {p?.isTraining && <span title="训练日">💪</span>}
                    {p && !p.isTraining && <span title="恢复日">🧘</span>}
                    {m && (
                      <span className="text-[10px] text-zinc-400" title={`饮食 ${mealDone}/4`}>
                        🍽{mealDone}/4
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-zinc-400">💪 训练日 · 🧘 恢复日 · 🍽n/4 当日餐食打卡数 · ✓ 当日训练已完成</p>
        </Card>
      )}

      <Disclaimer />
      <p className="print-footer">FitPlate · 热量与运动建议仅供参考,不构成医疗或营养治疗建议。周期:{props.from} 至 {props.to}。</p>
      <Toast message={toast} />
    </div>
  );
}
