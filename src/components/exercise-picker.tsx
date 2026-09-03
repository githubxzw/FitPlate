"use client";

// 动作选择器弹窗:按类型/肌群分组列出可用动作(器械过滤),供「添加动作」与周模板编辑器复用

import { useMemo, useState } from "react";
import { Badge, Modal } from "@/components/ui";
import { EXERCISES, type Exercise } from "@/lib/exercises";
import { cn } from "@/lib/utils";

const KIND_LABEL: Record<Exercise["type"], string> = {
  warmup: "热身",
  strength: "力量",
  cardio: "有氧",
  stretch: "拉伸",
};

const LEVEL_LABEL: Record<number, string> = { 1: "入门", 2: "进阶", 3: "高阶" };

export function ExercisePicker({
  open,
  onClose,
  kind,
  equipment,
  maxLevel = 3,
  excludeIds = [],
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  /** 只显示该类型的动作 */
  kind: Exercise["type"] | "all";
  equipment: string[];
  /** 用户水平上限(1-3),超出等级的动作置灰不可点 */
  maxLevel?: 1 | 2 | 3;
  /** 已在使用中的动作 id(标注「已在清单」但仍可再次添加) */
  excludeIds?: string[];
  onPick: (ex: Exercise) => void;
}) {
  const [muscleFilter, setMuscleFilter] = useState<string>("全部");

  const list = useMemo(() => {
    return EXERCISES.filter((e) => (kind === "all" ? true : e.type === kind)).filter((e) =>
      e.equipment.some((eq) => eq === "none" || equipment.includes(eq))
    );
  }, [kind, equipment]);

  const muscles = useMemo(() => ["全部", ...new Set(list.map((e) => e.muscle))], [list]);
  const shown = muscleFilter === "全部" ? list : list.filter((e) => e.muscle === muscleFilter);

  return (
    <Modal open={open} onClose={onClose} title={kind === "all" ? "添加动作" : `添加${KIND_LABEL[kind]}动作`}>
      <div className="space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {muscles.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMuscleFilter(m)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs transition",
                muscleFilter === m
                  ? "border-brand-600 bg-brand-600 text-white"
                  : "border-zinc-200 text-zinc-500 hover:border-brand-400 dark:border-zinc-700 dark:text-zinc-400"
              )}
            >
              {m}
            </button>
          ))}
        </div>
        <div className="max-h-[50vh] space-y-1.5 overflow-y-auto pr-1">
          {shown.map((e) => {
            const tooHard = e.level > maxLevel;
            return (
              <button
                key={e.id}
                type="button"
                disabled={tooHard}
                onClick={() => onPick(e)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl border p-2.5 text-left text-sm transition",
                  tooHard
                    ? "cursor-not-allowed border-zinc-100 opacity-50 dark:border-zinc-800"
                    : "border-zinc-200 hover:border-brand-400 dark:border-zinc-700"
                )}
              >
                <span className="text-xl" aria-hidden>
                  {e.emoji}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="font-medium">{e.name}</span>
                  {excludeIds.includes(e.id) && (
                    <span className="ml-1.5 text-[10px] text-zinc-400">(已在清单)</span>
                  )}
                  <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                    {e.sets} × {e.unit === "reps" ? `${e.reps}次` : e.unit === "seconds" ? `${e.reps}秒` : `${e.reps}分钟`}
                    {e.restSec ? ` · 休${e.restSec}s` : ""} · {e.muscle}
                  </span>
                </span>
                <Badge tone={e.level === 1 ? "emerald" : e.level === 2 ? "amber" : "rose"}>{LEVEL_LABEL[e.level]}</Badge>
              </button>
            );
          })}
          {shown.length === 0 && <p className="py-6 text-center text-sm text-zinc-400">当前器械条件下没有该肌群的动作,试试调整器械或换肌群。</p>}
        </div>
        <p className="text-[11px] text-zinc-400">等级高于你的运动基础(当前上限 {LEVEL_LABEL[maxLevel]})的动作不可选;添加后可在编辑器里改组数/次数。</p>
      </div>
    </Modal>
  );
}
