"use client";

// 训练区块编辑器:四个区块(热身/力量/有氧/拉伸)支持 添加/删除/排序/改数值
// 供「今日训练卡」与「我的周模板」复用;只负责纯 UI 状态,保存由调用方决定。

import { useState } from "react";
import { Badge } from "@/components/ui";
import { ExercisePicker } from "@/components/exercise-picker";
import { EXERCISES, toItem, type Exercise } from "@/lib/exercises";
import type { BlockItem, PlanBlocks } from "@/types";
import { cn } from "@/lib/utils";

export function itemFromExercise(e: Exercise): BlockItem {
  return toItem(e);
}

const BLOCK_META: { key: keyof PlanBlocks; title: string; emoji: string; max: number }[] = [
  { key: "warmup", title: "热身", emoji: "🔥", max: 10 },
  { key: "strength", title: "力量训练", emoji: "🏋️", max: 12 },
  { key: "cardio", title: "有氧", emoji: "🏃", max: 6 },
  { key: "stretch", title: "拉伸放松", emoji: "🧘", max: 10 },
];

export function BlocksEditor({
  blocks,
  onChange,
  equipment,
  maxLevel = 3,
}: {
  blocks: PlanBlocks;
  onChange: (next: PlanBlocks) => void;
  equipment: string[];
  maxLevel?: 1 | 2 | 3;
}) {
  const [picker, setPicker] = useState<keyof PlanBlocks | null>(null);
  const [limitHint, setLimitHint] = useState<string | null>(null);

  function patchItem(key: keyof PlanBlocks, idx: number, patch: Partial<BlockItem>) {
    onChange({ ...blocks, [key]: (blocks[key] as BlockItem[]).map((x, i) => (i === idx ? { ...x, ...patch } : x)) });
  }

  function remove(key: keyof PlanBlocks, idx: number) {
    onChange({ ...blocks, [key]: (blocks[key] as BlockItem[]).filter((_, i) => i !== idx) });
  }

  function move(key: keyof PlanBlocks, idx: number, dir: -1 | 1) {
    const arr = [...(blocks[key] as BlockItem[])];
    const j = idx + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[idx], arr[j]] = [arr[j], arr[idx]];
    onChange({ ...blocks, [key]: arr });
  }

  function add(key: keyof PlanBlocks, ex: Exercise) {
    const item = itemFromExercise(ex);
    const max = BLOCK_META.find((m) => m.key === key)?.max ?? 12;
    const arr = blocks[key] as BlockItem[];
    if (arr.length >= max) {
      setLimitHint(`${BLOCK_META.find((m) => m.key === key)?.title}最多 ${max} 个动作`);
      return;
    }
    onChange({ ...blocks, [key]: [...arr, item] });
    setPicker(null);
  }

  const usedIds = EXERCISES.filter((e) =>
    Object.values(blocks).some((arr) => (arr as BlockItem[]).some((it) => it.exerciseId === e.id))
  ).map((e) => e.id);

  return (
    <div className="space-y-3">
      {BLOCK_META.map((g) => {
        const items = blocks[g.key] as BlockItem[];
        return (
          <div key={g.key} className="rounded-xl border border-zinc-200 p-2.5 dark:border-zinc-700">
            <div className="mb-1.5 flex items-center justify-between">
              <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                {g.emoji} {g.title} <span className="text-zinc-400">({items.length})</span>
              </div>
              <button type="button" className="btn-ghost px-2 py-0.5 text-xs" onClick={() => setPicker(g.key)}>
                ＋ 添加
              </button>
            </div>
            {items.length === 0 && <p className="px-1 py-2 text-xs text-zinc-400">还没有{g.title}动作,点「＋ 添加」。</p>}
            <ul className="space-y-1.5">
              {items.map((it, idx) => (
                <li key={`${it.exerciseId}-${idx}`} className="rounded-lg bg-zinc-50 px-2.5 py-2 text-sm dark:bg-zinc-800/60">
                  <div className="flex flex-wrap items-center gap-2">
                    <span aria-hidden>{it.emoji}</span>
                    <span className="min-w-0 flex-1 truncate font-medium">{it.name}</span>
                    <div className="flex items-center gap-1 text-xs">
                      <button type="button" className="btn-ghost px-1.5 py-0.5" onClick={() => move(g.key, idx, -1)} disabled={idx === 0} aria-label="上移">
                        ↑
                      </button>
                      <button type="button" className="btn-ghost px-1.5 py-0.5" onClick={() => move(g.key, idx, 1)} disabled={idx === items.length - 1} aria-label="下移">
                        ↓
                      </button>
                      <button type="button" className="btn-ghost px-1.5 py-0.5 text-rose-500" onClick={() => remove(g.key, idx)} aria-label="删除">
                        ✕
                      </button>
                    </div>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                    {it.unit !== "minutes" && (
                      <label className="flex items-center gap-1">
                        组数
                        <input
                          type="number"
                          min={1}
                          max={8}
                          className="input w-14 px-2 py-1"
                          value={it.sets ?? 3}
                          onChange={(e) => patchItem(g.key, idx, { sets: Number(e.target.value) })}
                        />
                      </label>
                    )}
                    <label className="flex items-center gap-1">
                      {it.unit === "reps" ? "次数" : it.unit === "seconds" ? "秒数" : "分钟"}
                      <input
                        type="number"
                        min={1}
                        max={300}
                        className="input w-16 px-2 py-1"
                        value={it.repsOrDuration ?? 10}
                        onChange={(e) => patchItem(g.key, idx, { repsOrDuration: Number(e.target.value) })}
                      />
                    </label>
                    {it.unit !== "minutes" && (
                      <label className="flex items-center gap-1">
                        休息(秒)
                        <input
                          type="number"
                          min={0}
                          max={300}
                          className="input w-16 px-2 py-1"
                          value={it.restSec ?? 60}
                          onChange={(e) => patchItem(g.key, idx, { restSec: Number(e.target.value) })}
                        />
                      </label>
                    )}
                    {it.tips.length > 0 && <Badge tone="zinc">{it.tips[0]}</Badge>}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        );
      })}

      <ExercisePicker
        open={picker !== null}
        onClose={() => {
          setPicker(null);
          setLimitHint(null);
        }}
        kind={picker ?? "all"}
        equipment={equipment}
        maxLevel={maxLevel}
        excludeIds={usedIds}
        onPick={(ex) => picker && add(picker, ex)}
      />
      {limitHint ? (
        <p className="text-[11px] text-rose-500">{limitHint},请先删除一个再添加。</p>
      ) : (
        <p className="text-[11px] text-zinc-400">添加/删除/排序/改数值后记得保存;保存会覆盖系统自动生成的结构。</p>
      )}
    </div>
  );
}

/** 区块统计徽章:力量 N 个 · 有氧… · 热身+拉伸… */
export function blocksSummary(blocks: PlanBlocks): string {
  const strength = blocks.strength.length;
  const cardio = blocks.cardio.map((c) => `${c.name} ${c.repsOrDuration}分钟`).join("、");
  return `${strength > 0 ? `力量 ${strength} 个动作 · ` : ""}${cardio || ""}${cardio ? " · " : ""}热身+拉伸 ${blocks.warmup.length}+${blocks.stretch.length} 项`;
}

export function estimateMinutes(blocks: PlanBlocks): number {
  const strengthMin = blocks.strength.reduce((s, it) => s + (it.sets ?? 3) * (0.75 + (it.restSec ?? 60) / 60), 0);
  const warmMin = blocks.warmup.reduce((s, it) => s + ((it.sets ?? 1) * (it.repsOrDuration ?? 30)) / 60, 0);
  const cardioMin = blocks.cardio.reduce((s, c) => s + (c.repsOrDuration ?? 0), 0);
  const stretchMin = blocks.stretch.reduce((s, it) => s + ((it.sets ?? 1) * (it.repsOrDuration ?? 30)) / 60, 0);
  return Math.round(warmMin + strengthMin + cardioMin + stretchMin);
}
