"use client";

// 今日计划客户端交互:训练打卡/自由编辑/替换/强度、组间休息计时器、四餐打卡/换菜/调份量、
// 饮水记录、体重快捷记录、连续打卡与成就解锁提醒、动作示范动图

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Badge, Card, CheckButton, EmptyState, Modal, SectionTitle, Spinner, Stat, Toast, Disclaimer } from "@/components/ui";
import { ProgressRing, MacroBars } from "@/components/charts";
import { SmartImage } from "@/components/smart-image";
import { BlocksEditor, estimateMinutes } from "@/components/blocks-editor";
import { ExerciseDemoModal } from "@/components/exercise-demo";
import { suggestReplacements } from "@/lib/workout-engine";
import { EXERCISE_MAP } from "@/lib/exercises";
import type { BlockItem, Goal, MealDayData, MealSlot, MealSlotType, PlanBlocks, ProfileInput, SourceRef } from "@/types";
import { GOAL_MEAL_LABEL, INTENSITY_LABEL, MEAL_SLOT_LABEL } from "@/lib/utils";
import { cn } from "@/lib/utils";

export interface TodayBadge {
  id: string;
  emoji: string;
  name: string;
  desc: string;
  unlocked: boolean;
  progress: number;
}

export interface TodayStats {
  streak: number;
  best: number;
  waterMl: number;
  waterGoalMl: number;
  todayWeightKg: number | null;
  latestWeightKg: number | null;
  firstWeightKg: number;
  badges: TodayBadge[];
}

export interface TodayProps {
  date: string;
  weekday: string;
  greeting: string;
  userName?: string | null;
  goal: Goal;
  planDayNumber: number;
  targets: { targetKcal: number; protein: number; carbs: number; fat: number; weeklyChangeKg: number };
  weightKg: number;
  goalWeightKg: number;
  profileInput: ProfileInput;
  stats: TodayStats;
  plan: {
    focus: string;
    isTraining: boolean;
    intensity: string;
    completed: boolean;
    blocks: PlanBlocks;
    aiTips: string[];
    sources: SourceRef[];
  } | null;
  meals: { slots: MealDayData; completedSlots: string[]; sources: SourceRef[] } | null;
  aiEnabled: boolean;
}

const GOAL_BADGE: Record<Goal, { text: string; tone: "emerald" | "amber" | "sky" }> = {
  cut: { text: "🔻 减脂中", tone: "emerald" },
  bulk: { text: "🔺 增肌中", tone: "amber" },
  maintain: { text: "⚖️ 维持中", tone: "sky" },
};

async function api(url: string, body: unknown, method = "POST") {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? "操作失败");
  return json.data;
}

const BADGES_SEEN_KEY = "fitplate-badges-seen";

export function TodayClient(props: TodayProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [errToast, setErrToast] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editBlocks, setEditBlocks] = useState<PlanBlocks | null>(props.plan?.blocks ?? null);
  const [swapFor, setSwapFor] = useState<BlockItem | null>(null);
  const [tips, setTips] = useState<string[]>(props.plan?.aiTips ?? []);
  const [weightOpen, setWeightOpen] = useState(false);
  const [timerSec, setTimerSec] = useState<number | null>(null);
  const [demoId, setDemoId] = useState<string | null>(null);
  const [unlocked, setUnlocked] = useState<TodayBadge | null>(null);

  const refresh = () => startTransition(() => router.refresh());

  // 成就解锁检测:首次访问记录基线,之后有新解锁才庆祝
  useEffect(() => {
    try {
      const raw = localStorage.getItem(BADGES_SEEN_KEY);
      const current = props.stats.badges.filter((b) => b.unlocked).map((b) => b.id);
      if (raw === null) {
        localStorage.setItem(BADGES_SEEN_KEY, JSON.stringify(current));
        return;
      }
      const seen = new Set<string>(JSON.parse(raw) as string[]);
      const fresh = props.stats.badges.find((b) => b.unlocked && !seen.has(b.id));
      if (fresh) {
        setUnlocked(fresh);
        localStorage.setItem(BADGES_SEEN_KEY, JSON.stringify([...seen, ...current]));
      }
    } catch {
      /* localStorage 不可用时静默跳过 */
    }
  }, [props.stats.badges]);

  useEffect(() => {
    if (!unlocked) return;
    const t = setTimeout(() => setUnlocked(null), 5000);
    return () => clearTimeout(t);
  }, [unlocked]);

  async function run(key: string, fn: () => Promise<void>, okMsg?: string) {
    setBusy(key);
    try {
      await fn();
      if (okMsg) setToast(okMsg);
      refresh();
    } catch (e) {
      setErrToast(e instanceof Error ? e.message : "操作失败");
    } finally {
      setBusy(null);
    }
  }

  const plan = props.plan;
  const meals = props.meals;
  const stats = props.stats;
  const hasAnything = plan || meals;

  if (!hasAnything) {
    return (
      <div className="space-y-4">
        <EmptyState
          emoji="🚀"
          title="今天还没有计划"
          desc="可能计划周期已结束,或尚未生成。点击下方按钮,从今天开始一个新的训练 + 饮食周期。"
          action={
            <button
              className="btn-primary"
              disabled={busy !== null}
              onClick={() =>
                run("gen-all", async () => {
                  await api("/api/plan", { scope: "all" });
                  await api("/api/meals?scope=all", {});
                }, "已生成新周期计划")
              }
            >
              {busy === "gen-all" && <Spinner />} 从今天生成计划
            </button>
          }
        />
        <Toast message={toast} />
        <Toast message={errToast} tone="err" />
      </div>
    );
  }

  const doneCount =
    (plan?.completed ? 1 : 0) +
    (meals ? (["breakfast", "lunch", "dinner", "snack"] as MealSlotType[]).filter((s) => meals.completedSlots.includes(s)).length : 0);
  const total = 5;
  const pct = Math.round((doneCount / total) * 100);

  const plannedKcal = meals ? Object.values(meals.slots).reduce((s, m) => s + m.kcal, 0) : 0;
  const plannedP = meals ? Object.values(meals.slots).reduce((s, m) => s + m.protein, 0) : 0;
  const plannedC = meals ? Object.values(meals.slots).reduce((s, m) => s + m.carbs, 0) : 0;
  const plannedF = meals ? Object.values(meals.slots).reduce((s, m) => s + m.fat, 0) : 0;

  // 体重进程:从起点体重 → 目标体重,当前位置投影到 0-100%
  const latest = stats.latestWeightKg ?? props.weightKg;
  const startW = stats.firstWeightKg;
  const goalW = props.goalWeightKg;
  const range = startW - goalW;
  const weightPct = range === 0 ? 100 : Math.round(Math.min(100, Math.max(0, ((startW - latest) / range) * 100)));
  const waterPct = Math.min(100, Math.round((stats.waterMl / Math.max(1, stats.waterGoalMl)) * 100));

  return (
    <div className="space-y-5">
      {/* ---------- Hero:今日概览渐变卡 ---------- */}
      <div className="relative animate-fade-up overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 via-brand-500 to-teal-500 p-5 text-white shadow-lift">
        <div className="pointer-events-none absolute -right-12 -top-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-20 right-24 h-44 w-44 rounded-full bg-teal-200/20 blur-2xl" aria-hidden />
        <div className="relative flex flex-wrap items-center gap-x-8 gap-y-4">
          <ProgressRing
            value={pct}
            label={`${doneCount}/${total}`}
            sub="今日完成度"
            size={112}
            color="#ffffff"
            trackColor="rgba(255,255,255,.25)"
            labelClass="text-white"
          />
          <div className="min-w-[220px] flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full bg-white/15 px-2.5 py-1 font-medium backdrop-blur-sm">📅 计划第 {props.planDayNumber} 天</span>
              <span className="rounded-full bg-white/15 px-2.5 py-1 font-medium backdrop-blur-sm">
                {GOAL_BADGE[props.goal].text}
              </span>
              {stats.streak > 0 && (
                <span className="rounded-full bg-white/15 px-2.5 py-1 font-medium backdrop-blur-sm">
                  <span className="mr-1 inline-block animate-float" aria-hidden>
                    🔥
                  </span>
                  连续 {stats.streak} 天
                  {stats.best > stats.streak && <span className="ml-1 text-white/70">· 最佳 {stats.best}</span>}
                </span>
              )}
            </div>
            <div>
              <div className="flex items-center justify-between text-xs text-white/85">
                <span>体重进程</span>
                <span className="tnum font-medium">
                  {startW}kg <span aria-hidden>→</span> {latest}kg <span aria-hidden>🎯</span> {goalW}kg
                </span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/25">
                <div className="h-full rounded-full bg-white transition-all duration-700 ease-out" style={{ width: `${weightPct}%` }} />
              </div>
              <div className="mt-1 text-[11px] text-white/70">
                目标进程 {weightPct}% · 预计每周{" "}
                {props.targets.weeklyChangeKg <= 0 ? `−${Math.abs(props.targets.weeklyChangeKg)}` : `+${props.targets.weeklyChangeKg}`} kg
              </div>
            </div>
          </div>
          <button
            className="btn rounded-xl border border-white/40 bg-white/15 px-3.5 py-2 text-sm font-medium text-white backdrop-blur-sm hover:bg-white/25"
            onClick={() => setWeightOpen(true)}
          >
            ⚖️ {stats.todayWeightKg !== null ? `今日已记录 ${stats.todayWeightKg}kg` : "记录今日体重"}
          </button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          {/* 训练卡 */}
          {plan && (
            <Card className="animate-fade-up">
              <SectionTitle
                icon="💪"
                title={plan.focus}
                right={
                  <div className="flex items-center gap-1.5">
                    {(["light", "standard", "plus"] as const).map((i) => (
                      <button
                        key={i}
                        disabled={busy !== null}
                        onClick={() =>
                          run(`intensity-${i}`, () => api("/api/plan/day", { date: props.date, intensity: i }, "PATCH"))
                        }
                        className={cn(
                          "whitespace-nowrap rounded-lg px-2 py-1 text-xs transition",
                          plan.intensity === i
                            ? "bg-brand-600 font-medium text-white shadow-brand"
                            : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400"
                        )}
                      >
                        {INTENSITY_LABEL[i]}
                      </button>
                    ))}
                  </div>
                }
              />
              <div className="mb-3 flex flex-wrap items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                <Badge tone={plan.isTraining ? "emerald" : "zinc"}>{plan.isTraining ? "训练日" : "恢复日"}</Badge>
                <Badge tone="sky">
                  {(() => {
                    const warm = plan.blocks.warmup.length;
                    const strength = plan.blocks.strength.length;
                    const cardio = plan.blocks.cardio.map((c) => `${c.name} ${c.repsOrDuration}分钟`).join("、");
                    return `${strength > 0 ? `力量 ${strength} 个动作 · ` : ""}${cardio || ""} · 热身+拉伸 ${warm}+${plan.blocks.stretch.length} 项`;
                  })()}
                </Badge>
                <Badge tone="amber">约 {estimateMinutes(plan.blocks)} 分钟</Badge>
              </div>

              {/* 动作列表:只读视图 / 自由编辑视图 */}
              {editing && editBlocks ? (
                <BlocksEditor
                  blocks={editBlocks}
                  onChange={setEditBlocks}
                  equipment={props.profileInput.equipment}
                  maxLevel={props.profileInput.experience === "advanced" ? 3 : props.profileInput.experience === "intermediate" ? 2 : 1}
                />
              ) : (
                <BlockList
                  blocks={plan.blocks}
                  onStartEdit={(b) => {
                    setEditBlocks(b);
                    setEditing(true);
                  }}
                  onReplace={(item) => setSwapFor(item)}
                  onRest={(sec) => setTimerSec(sec)}
                  onDemo={(id) => setDemoId(id)}
                  onRegenerateDay={() =>
                    run("regen-day", () => api("/api/plan", { scope: "day", date: props.date }), "今日训练已重新生成")
                  }
                  regenBusy={busy === "regen-day" || pending}
                  isRest={!plan.isTraining}
                />
              )}

              {editing && editBlocks && (
                <div className="mt-3 flex gap-2">
                  <button
                    className="btn-primary"
                    disabled={busy !== null}
                    onClick={() =>
                      run("save-blocks", async () => {
                        await api("/api/plan/day", { date: props.date, blocks: editBlocks }, "PATCH");
                        setEditing(false);
                      }, "已保存修改")
                    }
                  >
                    {busy === "save-blocks" && <Spinner />} 保存修改
                  </button>
                  <button
                    className="btn-ghost"
                    onClick={() => {
                      setEditBlocks(plan.blocks);
                      setEditing(false);
                    }}
                  >
                    取消
                  </button>
                </div>
              )}

              <div className="mt-4 flex items-center gap-2">
                <CheckButton
                  checked={plan.completed}
                  label={plan.isTraining ? "完成训练打卡" : "完成恢复日打卡"}
                  onChange={(v) => run("check-workout", () => api("/api/checkin", { date: props.date, kind: "workout", value: v }))}
                />
                {busy === "check-workout" && <Spinner className="text-brand-600" />}
                <span className="ml-auto text-xs text-zinc-400">强度档会同步缩放组数与有氧时长</span>
              </div>

              {/* 教练提示 */}
              {tips.length > 0 && (
                <div className="mt-4 rounded-xl bg-sky-50 p-3 text-sm text-sky-900 dark:bg-sky-900/30 dark:text-sky-200">
                  <div className="mb-1 text-xs font-semibold text-sky-700 dark:text-sky-300">🧑‍🏫 今日提示</div>
                  <ul className="list-inside list-disc space-y-0.5">
                    {tips.map((t, i) => (
                      <li key={i}>{t}</li>
                    ))}
                  </ul>
                  {props.aiEnabled && (
                    <button
                      className="mt-2 text-xs underline text-sky-600 dark:text-sky-400"
                      onClick={() =>
                        run("ai-tip", async () => {
                          const data = await api(`/api/ai/tip?date=${props.date}`, null, "GET");
                          setTips(data.tips);
                          setToast("已更新建议");
                        })
                      }
                    >
                      换一批建议(AI)
                    </button>
                  )}
                </div>
              )}
            </Card>
          )}

          {/* 饮食卡 */}
          {meals && (
            <Card className="animate-fade-up">
              <SectionTitle
                icon="🍽️"
                title={`今日${GOAL_MEAL_LABEL[props.goal]}`}
                right={
                  <button
                    className="btn-ghost text-xs"
                    disabled={busy !== null}
                    onClick={() => run("regen-meals", () => api(`/api/meals?scope=day&date=${props.date}`, {}, "POST"), "今日饮食已重新生成")}
                  >
                    {busy === "regen-meals" ? <Spinner /> : "🔄"} 重新生成
                  </button>
                }
              />
              <div className="grid gap-3 sm:grid-cols-2">
                {(["breakfast", "lunch", "dinner", "snack"] as MealSlotType[]).map((slot) => {
                  const m: MealSlot = meals.slots[slot];
                  if (!m) return null;
                  const done = meals.completedSlots.includes(slot);
                  return (
                    <div
                      key={slot}
                      className={cn(
                        "card-hover rounded-xl border p-3 transition",
                        done
                          ? "border-brand-300 bg-brand-50/60 dark:border-brand-800 dark:bg-brand-900/20"
                          : "border-zinc-200 dark:border-zinc-800"
                      )}
                    >
                      <div className="flex gap-3">
                        <Link
                          href={`/meal/${props.date}/${slot}`}
                          className="group relative block h-20 w-20 shrink-0 overflow-hidden rounded-lg"
                          aria-label={`查看${MEAL_SLOT_LABEL[slot]}详情`}
                        >
                          <div className="h-full w-full transition duration-300 group-hover:scale-110">
                            <SmartImage seed={m.recipeId} emoji={m.emoji} label={m.name} query={m.name} />
                          </div>
                        </Link>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <Badge tone="zinc">{MEAL_SLOT_LABEL[slot]}</Badge>
                            <span className="truncate text-sm font-medium">{m.name}</span>
                          </div>
                          <div className="tnum mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                            {m.kcal} kcal · 蛋白 {m.protein}g · {m.minutes} 分钟
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            <CheckButton
                              size="sm"
                              checked={done}
                              label="完成"
                              onChange={(v) => run(`check-${slot}`, () => api("/api/checkin", { date: props.date, kind: slot, value: v }))}
                            />
                            <button
                              className="btn-ghost px-2 py-1 text-xs"
                              disabled={busy !== null}
                              onClick={() => run(`swap-${slot}`, () => api("/api/meals/day", { date: props.date, slot, action: "swap" }, "PATCH"), "已换一道")}
                              title="换一道"
                            >
                              🔁
                            </button>
                            <button
                              className="btn-ghost px-2 py-1 text-xs"
                              disabled={busy !== null || m.scale <= 0.5}
                              onClick={() => run(`scale-down-${slot}`, () => api("/api/meals/day", { date: props.date, slot, action: "scale", scale: Math.max(0.5, m.scale - 0.1) }, "PATCH"))}
                              title="减少份量"
                            >
                              −
                            </button>
                            <span className="tnum text-[11px] text-zinc-400">×{m.scale}</span>
                            <button
                              className="btn-ghost px-2 py-1 text-xs"
                              disabled={busy !== null || m.scale >= 2}
                              onClick={() => run(`scale-up-${slot}`, () => api("/api/meals/day", { date: props.date, slot, action: "scale", scale: Math.min(2, m.scale + 0.1) }, "PATCH"))}
                              title="增加份量"
                            >
                              +
                            </button>
                            <Link href={`/meal/${props.date}/${slot}`} className="btn-soft px-2 py-1 text-xs">
                              详情
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="mt-3 text-xs text-zinc-400">
                已按你的过敏原 / 忌口 / 预算 / 烹饪时长筛选;点击图片或「详情」查看食材克数、步骤与替代食材。
              </p>
            </Card>
          )}
        </div>

        {/* ---------- 右栏 ---------- */}
        <div className="space-y-5">
          {/* 目标与进度 */}
          <Card className="animate-fade-up">
            <SectionTitle
              icon="🎯"
              title="目标与进度"
              right={
                <Link href="/onboarding" className="text-[11px] text-zinc-400 underline">
                  切换目标
                </Link>
              }
            />
            <Badge tone={GOAL_BADGE[props.goal].tone}>{GOAL_BADGE[props.goal].text}</Badge>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Stat label="计划摄入" value={`${plannedKcal}`} sub="kcal" />
              <Stat label="热量目标" value={`${props.targets.targetKcal}`} sub="kcal / 天" />
            </div>
            <div className="mt-3">
              <div className="mb-1 text-xs text-zinc-500 dark:text-zinc-400">预计每周变化</div>
              <div className="tnum text-sm font-semibold">
                {props.targets.weeklyChangeKg <= 0 ? `−${Math.abs(props.targets.weeklyChangeKg)} kg` : `+${props.targets.weeklyChangeKg} kg`}
                <span className="ml-2 text-xs font-normal text-zinc-400">
                  当前 {props.weightKg}kg → 目标 {props.goalWeightKg}kg
                </span>
              </div>
            </div>
          </Card>

          {/* 饮水卡 */}
          <Card className="animate-fade-up">
            <SectionTitle
              icon="💧"
              title="今日饮水"
              right={
                <span className="tnum text-xs text-zinc-500 dark:text-zinc-400">
                  {stats.waterMl} / {stats.waterGoalMl} ml
                </span>
              }
            />
            <div className="h-3 overflow-hidden rounded-full bg-sky-100 dark:bg-sky-900/30">
              <div
                className={cn(
                  "h-full rounded-full bg-gradient-to-r from-sky-400 to-cyan-300 transition-all duration-500",
                  waterPct >= 100 && "from-brand-500 to-emerald-400"
                )}
                style={{ width: `${waterPct}%` }}
              />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              {[100, 250, 500].map((ml) => (
                <button
                  key={ml}
                  className="btn-ghost px-2.5 py-1 text-xs"
                  disabled={busy !== null}
                  onClick={() => run(`water-${ml}`, () => api("/api/daily-log", { date: props.date, waterDeltaMl: ml }), `已记录 +${ml}ml 💧`)}
                >
                  +{ml}ml
                </button>
              ))}
              <button
                className="btn-ghost px-2.5 py-1 text-xs text-zinc-400"
                disabled={busy !== null || stats.waterMl === 0}
                onClick={() => run("water-reset", () => api("/api/daily-log", { date: props.date, waterDeltaMl: -stats.waterMl }))}
              >
                清零
              </button>
            </div>
            <p className="mt-2 text-xs text-zinc-400">
              {waterPct >= 100 ? "🎉 今日饮水已达标!" : `按体重估算约 ${stats.waterGoalMl}ml(35ml/kg),喝水也能提升代谢。`}
            </p>
          </Card>

          <Card className="animate-fade-up">
            <SectionTitle icon="📊" title="营养素 vs 目标" />
            <MacroBars
              items={[
                { label: "蛋白质", actual: plannedP, target: props.targets.protein, unit: "g", tone: "#10b981" },
                { label: "碳水", actual: plannedC, target: props.targets.carbs, unit: "g", tone: "#0ea5e9" },
                { label: "脂肪", actual: plannedF, target: props.targets.fat, unit: "g", tone: "#f59e0b" },
              ]}
            />
            <p className="mt-2 text-xs text-zinc-400">按今日四餐的计划值汇总,可调份量贴近目标。</p>
          </Card>

          {(plan?.sources?.length || meals?.sources?.length) && (
            <Card>
              <SectionTitle icon="📚" title="参考来源" />
              <ul className="space-y-2 text-xs">
                {(plan?.sources ?? meals?.sources ?? []).slice(0, 4).map((s) => (
                  <li key={s.url}>
                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="font-medium text-brand-700 hover:underline dark:text-brand-400">
                      {s.title}
                    </a>
                    <div className="text-zinc-400">
                      {s.source} · 访问于 {s.accessedAt.slice(0, 10)}
                    </div>
                  </li>
                ))}
              </ul>
              <Link href="/sources" className="mt-2 inline-block text-xs text-zinc-500 underline dark:text-zinc-400">
                查看全部来源与检索 →
              </Link>
            </Card>
          )}

          <Disclaimer />
        </div>
      </div>

      {/* 替换动作弹窗 */}
      <Modal open={swapFor !== null} onClose={() => setSwapFor(null)} title={`替换「${swapFor?.name ?? ""}」`}>
        {swapFor && (
          <div className="space-y-2">
            {suggestReplacements(swapFor.exerciseId, props.profileInput).length === 0 && (
              <p className="text-sm text-zinc-500">当前器械条件下没有找到同部位的替代动作。</p>
            )}
            {suggestReplacements(swapFor.exerciseId, props.profileInput).map((id) => {
              const ex = EXERCISE_MAP[id];
              if (!ex) return null;
              return (
                <button
                  key={id}
                  className="flex w-full items-center gap-3 rounded-xl border border-zinc-200 p-3 text-left text-sm transition hover:border-brand-400 hover:bg-brand-50/40 dark:border-zinc-700 dark:hover:bg-brand-900/20"
                  onClick={() => {
                    const base = editBlocks ?? plan?.blocks;
                    if (!base) return;
                    const blocks: PlanBlocks = {
                      ...base,
                      strength: base.strength.map((it) =>
                        it.exerciseId === swapFor.exerciseId
                          ? { ...it, exerciseId: ex.id, name: ex.name, emoji: ex.emoji, sets: ex.sets, repsOrDuration: ex.reps, unit: ex.unit, restSec: ex.restSec, tips: ex.tips }
                          : it
                      ),
                    };
                    setEditBlocks(blocks);
                    setSwapFor(null);
                    setEditing(true);
                    setToast("已在本地替换,记得保存修改");
                  }}
                >
                  <span className="text-xl" aria-hidden>
                    {ex.emoji}
                  </span>
                  <span>
                    <span className="font-medium">{ex.name}</span>
                    <span className="ml-2 text-xs text-zinc-400">
                      {ex.sets}×{ex.unit === "reps" ? `${ex.reps}次` : ex.unit === "seconds" ? `${ex.reps}秒` : `${ex.reps}分钟`} · {ex.muscle}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </Modal>

      {/* 体重记录弹窗 */}
      <WeightModal
        open={weightOpen}
        onClose={() => setWeightOpen(false)}
        defaultWeight={stats.todayWeightKg ?? stats.latestWeightKg ?? props.weightKg}
        busy={busy === "weight"}
        onSave={(kg) =>
          run("weight", async () => {
            await api("/api/daily-log", { date: props.date, weightKg: kg });
            setWeightOpen(false);
          }, "已记录体重,热量目标已同步更新 ⚖️")
        }
      />

      {/* 组间休息计时器(参考 Strong) */}
      <RestTimer seconds={timerSec} onClose={() => setTimerSec(null)} />

      {/* 动作示范弹窗(动图 + 分步说明) */}
      <ExerciseDemoModal exerciseId={demoId} onClose={() => setDemoId(null)} />

      {/* 成就解锁庆祝(参考 Keep 勋章体系) */}
      {unlocked && (
        <div className="no-print fixed left-1/2 top-16 z-[70] -translate-x-1/2 animate-pop-in px-4">
          <div className="glass flex items-center gap-3 rounded-2xl py-3 pl-4 pr-3 shadow-lift">
            <span className="animate-float text-3xl" aria-hidden>
              {unlocked.emoji}
            </span>
            <div>
              <div className="text-xs font-semibold text-brand-600 dark:text-brand-400">🏆 成就解锁</div>
              <div className="text-sm font-medium">{unlocked.name}</div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400">{unlocked.desc}</div>
            </div>
            <button className="btn-ghost ml-2 px-2 py-1 text-xs" onClick={() => setUnlocked(null)}>
              收下
            </button>
          </div>
        </div>
      )}

      <Toast message={toast} />
      <Toast message={errToast} tone="err" />
    </div>
  );
}

/** 体重快捷记录弹窗 */
function WeightModal({
  open,
  onClose,
  defaultWeight,
  busy,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  defaultWeight: number;
  busy: boolean;
  onSave: (kg: number) => void;
}) {
  const [val, setVal] = useState(String(defaultWeight));
  useEffect(() => {
    if (open) setVal(String(defaultWeight));
  }, [open, defaultWeight]);
  const n = Number(val);
  const valid = Number.isFinite(n) && n >= 25 && n <= 300;
  return (
    <Modal open={open} onClose={onClose} title="记录体重">
      <div className="space-y-3">
        <div>
          <label className="label" htmlFor="weight-input">
            今日体重(kg)
          </label>
          <input
            id="weight-input"
            className="input tnum text-lg"
            type="number"
            inputMode="decimal"
            step="0.1"
            min={25}
            max={300}
            value={val}
            onChange={(e) => setVal(e.target.value)}
            autoFocus
          />
        </div>
        <p className="text-xs text-zinc-400">
          建议每天清晨空腹、如厕后称重,数据更有可比性。记录后会同步更新你的当前体重与热量目标(MacroFactor 式动态调整)。
        </p>
        <div className="flex gap-2">
          <button className="btn-primary flex-1" disabled={!valid || busy} onClick={() => onSave(Math.round(n * 10) / 10)}>
            {busy && <Spinner />} 保存
          </button>
          <button className="btn-ghost" onClick={onClose}>
            取消
          </button>
        </div>
      </div>
    </Modal>
  );
}

/** 组间休息倒计时:SVG 圆环 + 开始/暂停/重置 */
export function RestTimer({ seconds, onClose }: { seconds: number | null; onClose: () => void }) {
  const [left, setLeft] = useState(0);
  const [running, setRunning] = useState(true);

  useEffect(() => {
    if (seconds !== null) {
      setLeft(seconds);
      setRunning(true);
    }
  }, [seconds]);

  useEffect(() => {
    if (!running || left <= 0) return;
    const t = setTimeout(() => setLeft((l) => l - 1), 1000);
    return () => clearTimeout(t);
  }, [running, left]);

  if (seconds === null) return null;
  const total = seconds;
  const done = left <= 0;
  const R = 56;
  const C = 2 * Math.PI * R;
  const dash = total > 0 ? (left / total) * C : 0;
  const mm = Math.floor(left / 60);
  const ss = left % 60;

  return (
    <Modal open onClose={onClose} title="组间休息">
      <div className="flex flex-col items-center gap-4 py-2">
        <div className="relative h-40 w-40">
          <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90">
            <circle cx="70" cy="70" r={R} fill="none" strokeWidth="10" className="stroke-zinc-100 dark:stroke-zinc-800" />
            <circle
              cx="70"
              cy="70"
              r={R}
              fill="none"
              strokeWidth="10"
              strokeLinecap="round"
              className={cn("transition-all duration-1000 ease-linear", done ? "stroke-brand-500" : "stroke-sky-500")}
              strokeDasharray={C}
              strokeDashoffset={C - dash}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {done ? (
              <span className="animate-pop-in text-4xl" aria-hidden>
                💪
              </span>
            ) : (
              <span className="tnum text-3xl font-bold">
                {mm}:{String(ss).padStart(2, "0")}
              </span>
            )}
            <span className="mt-1 text-xs text-zinc-400">{done ? "休息结束,开练!" : running ? "休息中…" : "已暂停"}</span>
          </div>
        </div>
        <div className="flex gap-2">
          {done ? (
            <button className="btn-primary" onClick={onClose}>
              继续训练
            </button>
          ) : (
            <>
              <button className="btn-ghost" onClick={() => setRunning((r) => !r)}>
                {running ? "⏸ 暂停" : "▶ 继续"}
              </button>
              <button
                className="btn-ghost"
                onClick={() => {
                  setLeft(total);
                  setRunning(true);
                }}
              >
                ↺ 重置
              </button>
              <button className="btn-primary" onClick={onClose}>
                跳过
              </button>
            </>
          )}
        </div>
        <p className="text-xs text-zinc-400">建议组间休息 45–90 秒;复合动作可延长到 2 分钟。</p>
      </div>
    </Modal>
  );
}

/** 训练区块列表(只读视图):支持「示范动图」「休息计时」「替换动作」「进入自由编辑」 */
function BlockList({
  blocks,
  onStartEdit,
  onReplace,
  onRest,
  onDemo,
  onRegenerateDay,
  regenBusy,
  isRest,
}: {
  blocks: PlanBlocks;
  onStartEdit: (b: PlanBlocks) => void;
  onReplace: (item: BlockItem) => void;
  onRest: (seconds: number) => void;
  onDemo: (exerciseId: string) => void;
  onRegenerateDay: () => void;
  regenBusy: boolean;
  isRest: boolean;
}) {
  const [openTips, setOpenTips] = useState<string | null>(null);
  const groups: { title: string; emoji: string; items: BlockItem[] }[] = [
    { title: "热身", emoji: "🔥", items: blocks.warmup },
    { title: "力量训练", emoji: "🏋️", items: blocks.strength },
    { title: "有氧", emoji: "🏃", items: blocks.cardio },
    { title: "拉伸放松", emoji: "🧘", items: blocks.stretch },
  ];

  return (
    <div className="space-y-3">
      {groups
        .filter((g) => g.items.length > 0)
        .map((g) => (
          <div key={g.title}>
            <div className="mb-1.5 text-xs font-semibold text-zinc-400">
              {g.emoji} {g.title}
            </div>
            <ul className="space-y-1.5">
              {g.items.map((it) => (
                <li
                  key={it.exerciseId}
                  className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl bg-zinc-50 px-3 py-2 text-sm transition hover:bg-zinc-100 dark:bg-zinc-800/60 dark:hover:bg-zinc-800"
                >
                  <span aria-hidden>{it.emoji}</span>
                  <span className="font-medium">{it.name}</span>
                  <span className="tnum text-zinc-500 dark:text-zinc-400">
                    {it.sets && it.sets > 1 ? `${it.sets} × ` : ""}
                    {it.unit === "reps" ? `${it.repsOrDuration} 次` : it.unit === "seconds" ? `${it.repsOrDuration} 秒` : `${it.repsOrDuration} 分钟`}
                  </span>
                  {it.restSec ? <span className="tnum text-xs text-zinc-400">休 {it.restSec}s</span> : null}
                  <button
                    className="text-xs font-medium text-sky-600 hover:underline dark:text-sky-400"
                    onClick={() => onDemo(it.exerciseId)}
                    title="查看动作示范"
                  >
                    ▶ 示范
                  </button>
                  {it.tips.length > 0 && (
                    <button className="text-xs text-brand-600 underline dark:text-brand-400" onClick={() => setOpenTips(openTips === it.exerciseId ? null : it.exerciseId)}>
                      要点
                    </button>
                  )}
                  {g.title === "力量训练" && it.restSec ? (
                    <button className="btn-ghost ml-auto px-2 py-0.5 text-xs" onClick={() => onRest(it.restSec ?? 60)} title="开始休息计时">
                      ⏱ {it.restSec}s
                    </button>
                  ) : null}
                  {g.title === "力量训练" && !isRest && (
                    <button className={cn("btn-ghost px-2 py-0.5 text-xs", !it.restSec && "ml-auto")} onClick={() => onReplace(it)} title="替换动作">
                      换
                    </button>
                  )}
                  {openTips === it.exerciseId && (
                    <div className="w-full rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
                      <ul className="list-inside list-disc space-y-0.5">
                        {it.tips.map((t, i) => (
                          <li key={i}>{t}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      <div className="flex justify-end gap-2">
        <button className="btn-ghost text-xs" disabled={regenBusy} onClick={onRegenerateDay}>
          {regenBusy ? <Spinner /> : "🔄"} 换一套今日训练
        </button>
        <button className="btn-soft text-xs" onClick={() => onStartEdit(blocks)} disabled={regenBusy}>
          ✏️ 编辑动作项
        </button>
      </div>
    </div>
  );
}
