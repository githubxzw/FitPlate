"use client";

// 我的周模板:定义周一..周日各练什么(休息 / 内置模板 / 完全自定义动作清单)
// 保存后可立即按新模板重新生成整个周期(已打卡日期保留)。

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge, Card, SectionTitle, Spinner, Toast } from "@/components/ui";
import { BlocksEditor, estimateMinutes } from "@/components/blocks-editor";
import { TEMPLATE_LABEL, WEEKDAY_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { PlanBlocks, WeekDayDef } from "@/types";

const EMPTY_BLOCKS: PlanBlocks = { warmup: [], strength: [], cardio: [], stretch: [] };

async function api(url: string, body: unknown, method = "PUT") {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? "保存失败");
  return json.data;
}

export function CustomWeekClient({
  initialWeek,
  initialEnabled,
  equipment,
  experience,
  durationDays,
  startDate,
}: {
  initialWeek: WeekDayDef[] | null;
  initialEnabled: boolean;
  equipment: string[];
  experience: "beginner" | "intermediate" | "advanced";
  durationDays: number;
  startDate: string;
}) {
  const router = useRouter();
  const maxLevel = experience === "advanced" ? 3 : experience === "intermediate" ? 2 : 1;
  const [week, setWeek] = useState<WeekDayDef[]>(initialWeek ?? WEEKDAY_LABELS.map(() => ({ type: "rest" }) as WeekDayDef));
  const [enabled, setEnabled] = useState(initialEnabled);
  const [open, setOpen] = useState<number | null>(null); // 展开编辑的天
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const trainingDays = week.filter((d) => d.type !== "rest").length;

  function setDay(i: number, def: WeekDayDef) {
    setWeek((w) => w.map((x, j) => (j === i ? def : x)));
  }

  async function save(regenerate: boolean) {
    if (trainingDays === 0) {
      setErr("一周内至少要有一个训练日");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await api("/api/plan/week", { week, enabled: regenerate ? true : enabled, regenerate });
      setToast(regenerate ? "已保存并按新模板重新生成计划" : "已保存周模板");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "保存失败");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setErr(null);
    try {
      await api("/api/plan/week", { week, enabled: false, regenerate: true });
      setEnabled(false);
      setToast("已切换回系统自动模板");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "操作失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle
          icon="🗓️"
          title="我的周模板"
          right={
            <span className={cn("chip", enabled ? "bg-brand-600 text-white" : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400")}>
              {enabled ? "已启用" : "未启用"}
            </span>
          }
        />
        <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
          为每一天选择 <b>休息</b> / <b>内置模板</b>(系统按你的器械与运动基础自动排动作)/ <b>自定义</b>(自己列动作)。
          启用后,每天生成与「重新生成计划」都会按这份模板执行;已打卡的日期会保留。
        </p>

        <div className="space-y-2.5">
          {WEEKDAY_LABELS.map((wd, i) => {
            const def = week[i];
            const isOpen = open === i;
            return (
              <div key={wd} className={cn("rounded-xl border transition", isOpen ? "border-brand-400 bg-brand-50/40 dark:bg-brand-900/20" : "border-zinc-200 dark:border-zinc-700")}>
                <div className="flex flex-wrap items-center gap-2 p-3">
                  <button type="button" className="btn-ghost px-2 py-1 text-sm" onClick={() => setOpen(isOpen ? null : i)} aria-expanded={isOpen}>
                    {isOpen ? "收起 ▲" : "编辑 ▼"}
                  </button>
                  <span className="w-12 shrink-0 text-sm font-semibold">{wd}</span>
                  <select
                    className="input w-auto px-2 py-1 text-sm"
                    value={def.type === "rest" ? "rest" : def.type === "template" ? def.templateId : "custom"}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === "rest") setDay(i, { type: "rest" });
                      else if (v === "custom") setDay(i, { type: "custom", focus: week[i].type === "custom" ? (week[i] as { focus: string }).focus : "自定义训练", blocks: week[i].type === "custom" ? (week[i] as { blocks: PlanBlocks }).blocks : { ...EMPTY_BLOCKS } });
                      else setDay(i, { type: "template", templateId: v });
                    }}
                  >
                    <option value="rest">休息日</option>
                    {Object.entries(TEMPLATE_LABEL).map(([id, label]) => (
                      <option key={id} value={id}>
                        {label}
                      </option>
                    ))}
                    <option value="custom">自定义动作清单</option>
                  </select>
                  {def.type === "custom" && (
                    <input
                      className="input w-40 px-2 py-1 text-sm"
                      value={def.focus}
                      maxLength={20}
                      onChange={(e) => setDay(i, { ...def, focus: e.target.value })}
                      placeholder="当日主题,如:胸+三头"
                    />
                  )}
                  <span className="ml-auto text-xs text-zinc-400">
                    {def.type === "rest" ? "恢复与散步" : def.type === "template" ? "系统排动作" : `${estimateMinutes(def.blocks)} 分钟 · ${def.blocks.strength.length} 个力量动作`}
                  </span>
                </div>
                {isOpen && def.type === "custom" && (
                  <div className="border-t border-brand-100 p-3 dark:border-brand-900/50">
                    <BlocksEditor blocks={def.blocks} onChange={(next) => setDay(i, { ...def, blocks: next })} equipment={equipment} maxLevel={maxLevel} />
                  </div>
                )}
                {isOpen && def.type !== "custom" && (
                  <div className="border-t border-zinc-100 px-3 py-2 text-xs text-zinc-400 dark:border-zinc-800">
                    {def.type === "rest" ? "休息日会生成散步 + 轻拉伸的恢复安排。" : "内置模板由系统按你的器械、水平与强度档自动排动作;训练当天仍可微调数值或换动作。"}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button type="button" className="btn-soft text-xs" onClick={() => save(false)} disabled={busy}>
            {busy ? <Spinner /> : null} 仅保存模板
          </button>
          <button type="button" className="btn-primary" onClick={() => save(true)} disabled={busy}>
            {busy ? <Spinner /> : "⚡"} 保存并重新生成计划
          </button>
          {enabled && (
            <button type="button" className="btn-ghost text-xs" onClick={disable} disabled={busy}>
              停用模板,改用系统自动
            </button>
          )}
          <label className="ml-auto flex cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" className="accent-brand-600" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
            启用此模板
          </label>
        </div>
        <div className="mt-2 flex items-center gap-2 text-xs text-zinc-400">
          <Badge tone="zinc">本周训练日 {trainingDays} 天</Badge>
          <span>当前周期 {durationDays} 天(起始 {startDate});重新生成会覆盖未打卡的日子。</span>
        </div>
        {err && <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:bg-rose-900/30 dark:text-rose-300">⚠️ {err}</p>}
      </Card>

      <div className="flex justify-between text-xs">
        <Link href="/plan" className="text-zinc-500 underline dark:text-zinc-400">← 回到计划表</Link>
        <Link href="/today" className="text-zinc-500 underline dark:text-zinc-400">查看今日计划 →</Link>
      </div>

      <Toast message={toast} />
      <Toast message={err} tone="err" />
    </div>
  );
}
