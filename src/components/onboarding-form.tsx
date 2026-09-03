"use client";

// 用户信息问卷:基本信息 → 目标与训练 → 饮食偏好,最后一步可预览推导结果
// 数字输入一律以字符串保存原始输入(可清空、可输入小数点),提交时才转数字,
// 避免「删空后卡住一个 0」的问题;校验失败会在前端给出具体字段提示并跳转对应步骤。

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Spinner, Badge } from "@/components/ui";
import { ALLERGY_OPTIONS, DEFAULT_GYM_EQUIPMENT, DEFAULT_HOME_EQUIPMENT, DIET_PREF_OPTIONS, EQUIPMENT_OPTIONS, FLAG_OPTIONS, GOAL_OPTIONS } from "@/lib/constants";
import { calcBMR, activityFactor, deriveTargets } from "@/lib/calc";
import { cn } from "@/lib/utils";
import type { Goal } from "@/types";

export interface ProfileFormState {
  sex: "male" | "female";
  age: string;
  heightCm: string;
  weightKg: string;
  bodyFatPct: string;
  goalWeightKg: string;
  durationDays: 7 | 14 | 30;
  experience: "beginner" | "intermediate" | "advanced";
  trainingDaysPerWeek: number;
  place: "home" | "gym";
  equipment: string[];
  dietPrefs: string[];
  allergies: string[];
  disliked: string[];
  budgetYuan: number;
  cookMinutes: number;
  flags: string[];
  goal: Goal;
}

export const DEFAULT_FORM: ProfileFormState = {
  sex: "male",
  age: "28",
  heightCm: "172",
  weightKg: "70",
  bodyFatPct: "",
  goalWeightKg: "65",
  durationDays: 30,
  experience: "beginner",
  trainingDaysPerWeek: 3,
  place: "home",
  equipment: DEFAULT_HOME_EQUIPMENT,
  dietPrefs: [],
  allergies: [],
  disliked: [],
  budgetYuan: 40,
  cookMinutes: 30,
  flags: [],
  goal: "cut",
};

export function toggle(list: string[], v: string): string[] {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

/** 数字输入:只允许数字与小数点(integer 时禁点),允许随时清空 */
function NumInput({
  id,
  value,
  onChange,
  integer = false,
  placeholder,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  integer?: boolean;
  placeholder?: string;
}) {
  return (
    <input
      id={id}
      type="text"
      inputMode={integer ? "numeric" : "decimal"}
      className="input"
      placeholder={placeholder}
      value={value}
      onChange={(e) => {
        let v = e.target.value.replace(/[^\d.]/g, "");
        if (integer) v = v.replace(/\./g, "");
        const parts = v.split(".");
        if (parts.length > 2) v = `${parts[0]}.${parts.slice(1).join("")}`;
        onChange(v);
      }}
    />
  );
}

function ChipGroup({
  options,
  selected,
  onToggle,
}: {
  options: { value: string; label: string }[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = selected.includes(o.value);
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onToggle(o.value)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm transition",
              active
                ? "border-brand-600 bg-brand-600 text-white"
                : "border-zinc-300 bg-white text-zinc-600 hover:border-brand-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** 服务端校验字段 → 中文提示与所在步骤(用于自动跳转) */
const FIELD_HINT: Record<string, string> = {
  age: "年龄需在 13~90 岁之间",
  heightCm: "身高需在 120~230 cm 之间",
  weightKg: "体重需在 30~250 kg 之间",
  goalWeightKg: "目标体重需在 30~250 kg 之间",
  bodyFatPct: "体脂率需在 3%~70% 之间",
  trainingDaysPerWeek: "每周可训练天数需在 1~7",
  budgetYuan: "每日预算需在 10~500 元",
  cookMinutes: "单餐烹饪时长需在 10~120 分钟",
  sex: "请选择性别",
  durationDays: "请选择计划周期",
  experience: "请选择运动基础",
  place: "请选择训练场地",
  equipment: "可用器械配置异常",
  dietPrefs: "饮食偏好配置异常",
  allergies: "过敏原配置异常",
  disliked: "忌口项过长(每个不超过 12 字)",
  flags: "特殊情况配置异常",
};

const FIELD_STEP: Record<string, number> = {
  goal: 0, sex: 0, age: 0, heightCm: 0, weightKg: 0, bodyFatPct: 0,
  goalWeightKg: 1, durationDays: 1, experience: 1, trainingDaysPerWeek: 1, place: 1, equipment: 1,
  dietPrefs: 2, allergies: 2, disliked: 2, budgetYuan: 2, cookMinutes: 2, flags: 2,
};

export function OnboardingForm({ initial }: { initial?: Partial<ProfileFormState> }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dislikeInput, setDislikeInput] = useState("");
  const [f, setF] = useState<ProfileFormState>({ ...DEFAULT_FORM, ...initial });

  const set = <K extends keyof ProfileFormState>(k: K, v: ProfileFormState[K]) => setF((p) => ({ ...p, [k]: v }));

  const preview = useMemo(() => {
    const n = (s: string) => (s.trim() === "" ? NaN : Number(s));
    const age = n(f.age);
    const h = n(f.heightCm);
    const w = n(f.weightKg);
    const gw = n(f.goalWeightKg);
    const bf = f.bodyFatPct.trim() === "" ? null : n(f.bodyFatPct);
    if (![age, h, w].every(Number.isFinite) || (bf !== null && !Number.isFinite(bf))) return null;
    const bmr = calcBMR({ sex: f.sex, age, heightCm: h, weightKg: w, bodyFatPct: bf });
    const tdee = bmr * activityFactor(Number(f.trainingDaysPerWeek));
    let targets: ReturnType<typeof deriveTargets> | null = null;
    if (Number.isFinite(gw)) {
      targets = deriveTargets({
        sex: f.sex,
        age,
        heightCm: h,
        weightKg: w,
        bodyFatPct: bf,
        goalWeightKg: gw,
        durationDays: f.durationDays,
        experience: f.experience,
        trainingDaysPerWeek: Number(f.trainingDaysPerWeek) || 3,
        place: f.place,
        equipment: f.equipment,
        dietPrefs: f.dietPrefs,
        allergies: f.allergies,
        disliked: f.disliked,
        budgetYuan: Number(f.budgetYuan) || 40,
        cookMinutes: Number(f.cookMinutes) || 30,
        flags: f.flags,
        goal: f.goal,
      });
    }
    return { bmr: Math.round(bmr), tdee: Math.round(tdee), targets };
  }, [f.sex, f.age, f.heightCm, f.weightKg, f.goalWeightKg, f.bodyFatPct, f.trainingDaysPerWeek, f.durationDays, f.experience, f.place, f.equipment, f.dietPrefs, f.allergies, f.disliked, f.budgetYuan, f.cookMinutes, f.flags, f.goal]);

  function changePlace(place: "home" | "gym") {
    setF((p) => ({
      ...p,
      place,
      equipment: place === "gym" ? DEFAULT_GYM_EQUIPMENT : DEFAULT_HOME_EQUIPMENT,
    }));
  }

  /** 切换目标:顺带给出合适的目标体重默认值(增肌 +3kg / 减脂 -当前-5kg / 维持 = 当前) */
  function setGoal(goal: Goal) {
    setF((p) => {
      const w = Number(p.weightKg);
      const cur = Number(p.goalWeightKg);
      let goalWeightKg = p.goalWeightKg;
      if (Number.isFinite(w) && w > 0) {
        if (goal === "bulk" && !(cur > w)) goalWeightKg = String(Math.round((w + 3) * 10) / 10);
        if (goal === "cut" && !(cur < w)) goalWeightKg = String(Math.round((w - Math.max(2, w * 0.06)) * 10) / 10);
        if (goal === "maintain") goalWeightKg = String(w);
      }
      return { ...p, goal, goalWeightKg };
    });
  }

  /** 提交前的本地校验:空值/范围给出具体中文提示,失败返回所在步骤 */
  function collectClientError(): { message: string; step: number } | null {
    const n = (s: string) => (s.trim() === "" ? NaN : Number(s));
    const checks: [string, string, number, number, number][] = [
      ["年龄", "年龄需在 13~90 岁之间", n(f.age), 13, 90],
      ["身高", "身高需在 120~230 cm 之间", n(f.heightCm), 120, 230],
      ["体重", "体重需在 30~250 kg 之间", n(f.weightKg), 30, 250],
      ["目标体重", "目标体重需在 30~250 kg 之间", n(f.goalWeightKg), 30, 250],
    ];
    for (const [label, hint, v, min, max] of checks) {
      if (!Number.isFinite(v)) return { message: `请填写${label}`, step: 0 };
      if (v < min || v > max) return { message: hint, step: 0 };
    }
    if (f.bodyFatPct.trim() !== "") {
      const bf = n(f.bodyFatPct);
      if (!Number.isFinite(bf) || bf < 3 || bf > 70) {
        return { message: "体脂率需在 3%~70% 之间(不确定可以留空)", step: 0 };
      }
    }
    return null;
  }

  async function submit() {
    const local = collectClientError();
    if (local) {
      setStep(local.step);
      setError(local.message);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const body = {
        ...f,
        age: Number(f.age),
        heightCm: Number(f.heightCm),
        weightKg: Number(f.weightKg),
        bodyFatPct: f.bodyFatPct ? Number(f.bodyFatPct) : null,
        goalWeightKg: Number(f.goalWeightKg),
        trainingDaysPerWeek: Number(f.trainingDaysPerWeek),
        budgetYuan: Number(f.budgetYuan),
        cookMinutes: Number(f.cookMinutes),
      };
      const res = await fetch("/api/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const json = await res.json();
      if (!res.ok) {
        const issues = json.issues as { path: string; message: string }[] | undefined;
        if (Array.isArray(issues) && issues.length > 0) {
          const hints = [...new Set(issues.map((i) => FIELD_HINT[i.path] ?? `${i.path} 格式不正确`))];
          const target = FIELD_STEP[issues[0].path];
          if (typeof target === "number") setStep(target);
          throw new Error(`请检查:${hints.join(";")}`);
        }
        throw new Error(json.error ?? "保存失败");
      }
      await fetch("/api/plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scope: "all" }) });
      await fetch("/api/meals?scope=all", { method: "POST" });
      router.push("/today");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败,请重试");
    } finally {
      setBusy(false);
    }
  }

  const steps = ["基本信息", "目标与训练", "饮食偏好"];

  return (
    <div className="card p-6">
      {/* 步骤指示 */}
      <div className="mb-6 flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={s} className="flex flex-1 items-center gap-2">
            <div
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                i <= step ? "bg-brand-600 text-white" : "bg-zinc-200 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
              )}
            >
              {i + 1}
            </div>
            <span className={cn("text-xs", i === step ? "font-medium" : "text-zinc-400")}>{s}</span>
            {i < steps.length - 1 && <div className={cn("h-px flex-1", i < step ? "bg-brand-500" : "bg-zinc-200 dark:bg-zinc-800")} />}
          </div>
        ))}
      </div>

      {step === 0 && (
        <div className="space-y-4">
          <div>
            <span className="label">我的目标</span>
            <div className="grid grid-cols-3 gap-2">
              {GOAL_OPTIONS.map((g) => (
                <button
                  key={g.value}
                  type="button"
                  onClick={() => setGoal(g.value)}
                  className={cn(
                    "rounded-xl border p-2.5 text-left text-sm transition",
                    f.goal === g.value ? "border-brand-600 bg-brand-50 dark:bg-brand-900/30" : "border-zinc-200 dark:border-zinc-700"
                  )}
                >
                  <div className="font-medium">
                    <span aria-hidden>{g.emoji}</span> {g.label}
                  </div>
                  <div className="mt-0.5 text-[11px] leading-snug text-zinc-400">{g.hint}</div>
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="label">性别</span>
              <div className="grid grid-cols-2 gap-1 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800">
                {(["female", "male"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => set("sex", s)}
                    className={cn("rounded-lg py-1.5 text-sm", f.sex === s ? "bg-white font-medium shadow dark:bg-zinc-900" : "text-zinc-500")}
                  >
                    {s === "female" ? "女" : "男"}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label" htmlFor="age">年龄</label>
              <NumInput id="age" integer value={f.age} onChange={(v) => set("age", v)} placeholder="如 28" />
            </div>
            <div>
              <label className="label" htmlFor="height">身高(cm)</label>
              <NumInput id="height" integer value={f.heightCm} onChange={(v) => set("heightCm", v)} placeholder="如 172" />
            </div>
            <div>
              <label className="label" htmlFor="weight">体重(kg)</label>
              <NumInput id="weight" value={f.weightKg} onChange={(v) => set("weightKg", v)} placeholder="如 70.5" />
            </div>
            <div className="col-span-2">
              <label className="label" htmlFor="bodyfat">体脂率(%)- 可选</label>
              <NumInput id="bodyfat" value={f.bodyFatPct} onChange={(v) => set("bodyFatPct", v)} placeholder="不知道可以留空" />
            </div>
          </div>
          <p className="text-xs text-zinc-400">填写体脂率可以用更精确的公式估算代谢,不确定就留空。</p>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="goal">
                目标体重(kg){f.goal === "bulk" ? " · 建议高于当前 2~4 kg" : f.goal === "maintain" ? " · 维持可填当前体重" : ""}
              </label>
              <NumInput id="goal" value={f.goalWeightKg} onChange={(v) => set("goalWeightKg", v)} placeholder={f.goal === "bulk" ? "如 73" : "如 65"} />
            </div>
            <div>
              <span className="label">计划周期</span>
              <div className="grid grid-cols-3 gap-1 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800">
                {([7, 14, 30] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => set("durationDays", d)}
                    className={cn("rounded-lg py-1.5 text-sm", f.durationDays === d ? "bg-white font-medium shadow dark:bg-zinc-900" : "text-zinc-500")}
                  >
                    {d}天
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div>
            <span className="label">运动基础</span>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  ["beginner", "初学者", "刚开始或久未运动"],
                  ["intermediate", "进阶", "规律运动 3 个月以上"],
                  ["advanced", "高阶", "长期系统训练"],
                ] as const
              ).map(([v, label, hint]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => set("experience", v)}
                  className={cn(
                    "rounded-xl border p-2.5 text-left text-sm transition",
                    f.experience === v ? "border-brand-600 bg-brand-50 dark:bg-brand-900/30" : "border-zinc-200 dark:border-zinc-700"
                  )}
                >
                  <div className="font-medium">{label}</div>
                  <div className="mt-0.5 text-[11px] leading-snug text-zinc-400">{hint}</div>
                </button>
              ))}
            </div>
          </div>
          <div>
            <span className="label">每周可训练天数:{f.trainingDaysPerWeek} 天</span>
            <input type="range" min={1} max={7} value={f.trainingDaysPerWeek} onChange={(e) => set("trainingDaysPerWeek", Number(e.target.value))} className="w-full accent-brand-600" />
          </div>
          <div>
            <span className="label">训练场地</span>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ["home", "居家", "🧘 徒手 + 小器械"],
                  ["gym", "健身房", "🏋️ 器械齐全"],
                ] as const
              ).map(([v, label, hint]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => changePlace(v)}
                  className={cn(
                    "rounded-xl border p-3 text-left text-sm transition",
                    f.place === v ? "border-brand-600 bg-brand-50 dark:bg-brand-900/30" : "border-zinc-200 dark:border-zinc-700"
                  )}
                >
                  <div className="font-medium">{label}</div>
                  <div className="text-[11px] text-zinc-400">{hint}</div>
                </button>
              ))}
            </div>
          </div>
          <div>
            <span className="label">可用器械(可多选)</span>
            <ChipGroup
              options={EQUIPMENT_OPTIONS.filter((e) => e.places.includes(f.place)).map((e) => ({ value: e.value, label: e.label }))}
              selected={f.equipment}
              onToggle={(v) => set("equipment", toggle(f.equipment, v))}
            />
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div>
            <span className="label">饮食偏好(可多选)</span>
            <ChipGroup options={DIET_PREF_OPTIONS.map((v) => ({ value: v, label: v }))} selected={f.dietPrefs} onToggle={(v) => set("dietPrefs", toggle(f.dietPrefs, v))} />
          </div>
          <div>
            <span className="label">过敏原(命中后自动排除相关食谱)</span>
            <ChipGroup options={ALLERGY_OPTIONS.map((v) => ({ value: v, label: v }))} selected={f.allergies} onToggle={(v) => set("allergies", toggle(f.allergies, v))} />
          </div>
          <div>
            <label className="label" htmlFor="dislike">忌口食材</label>
            <div className="flex gap-2">
              <input
                id="dislike"
                className="input"
                placeholder="输入后回车,如:香菜、肥肉"
                maxLength={12}
                value={dislikeInput}
                onChange={(e) => setDislikeInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && dislikeInput.trim()) {
                    e.preventDefault();
                    set("disliked", [...new Set([...f.disliked, dislikeInput.trim()])]);
                    setDislikeInput("");
                  }
                }}
              />
            </div>
            <p className="mt-1 text-xs text-zinc-400">每项不超过 12 个字,回车添加,点标签删除。</p>
            {f.disliked.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {f.disliked.map((d) => (
                  <button key={d} type="button" className="chip bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300" onClick={() => set("disliked", f.disliked.filter((x) => x !== d))}>
                    {d} ✕
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="label">每日餐饮预算:¥{f.budgetYuan}</span>
              <input type="range" min={15} max={120} step={5} value={f.budgetYuan} onChange={(e) => set("budgetYuan", Number(e.target.value))} className="w-full accent-brand-600" />
            </div>
            <div>
              <span className="label">单餐烹饪时长:≤{f.cookMinutes} 分钟</span>
              <input type="range" min={10} max={90} step={5} value={f.cookMinutes} onChange={(e) => set("cookMinutes", Number(e.target.value))} className="w-full accent-brand-600" />
            </div>
          </div>
          <div>
            <span className="label">特殊情况(仅用于提示,不会做医疗判断)</span>
            <div className="space-y-1.5">
              {FLAG_OPTIONS.map((o) => (
                <label key={o.value} className="flex cursor-pointer items-start gap-2 rounded-xl border border-zinc-200 p-2.5 text-sm dark:border-zinc-700">
                  <input type="checkbox" className="mt-0.5 accent-brand-600" checked={f.flags.includes(o.value)} onChange={() => set("flags", toggle(f.flags, o.value))} />
                  <span>
                    <span className="font-medium">{o.label}</span>
                    <span className="ml-1 text-xs text-zinc-400">{o.hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
          <div className="rounded-xl bg-zinc-50 p-3 text-sm dark:bg-zinc-800/60">
            <div className="flex flex-wrap items-center gap-2">
              {preview ? (
                <>
                  <Badge tone="sky">预估基础代谢 ≈ {preview.bmr} kcal</Badge>
                  <Badge tone="emerald">预估每日消耗 ≈ {preview.tdee} kcal</Badge>
                  {preview.targets && (
                    <>
                      <Badge tone={f.goal === "bulk" ? "amber" : "brand"}>
                        每日目标 ≈ {preview.targets.targetKcal} kcal
                        {preview.targets.deficitKcal !== 0 &&
                          `(${preview.targets.deficitKcal > 0 ? "+" : ""}${preview.targets.deficitKcal})`}
                      </Badge>
                      <Badge tone="zinc">
                        {f.goal === "bulk" ? "🔺 增肌" : f.goal === "maintain" ? "⚖️ 维持" : "🔻 减脂"} · 蛋白 {preview.targets.protein}g · 每周
                        {preview.targets.weeklyChangeKg >= 0 ? `+${preview.targets.weeklyChangeKg}` : preview.targets.weeklyChangeKg}kg
                      </Badge>
                    </>
                  )}
                </>
              ) : (
                <span className="text-xs text-zinc-400">回第 1 步填写完整的身高体重后,这里会实时显示代谢预估。</span>
              )}
            </div>
            <p className="mt-2 text-xs text-zinc-400">
              {f.goal === "bulk"
                ? "保存后系统会按小幅盈余给出热量与碳水/蛋白质目标,训练偏向肌肥大区间;所有数值仅供参考。"
                : f.goal === "maintain"
                  ? "保存后系统会按维持热量给出目标,训练与饮食保持均衡;所有数值仅供参考。"
                  : "保存后系统会按缺口给出每日热量与蛋白质目标;所有数值仅供参考。"}
            </p>
          </div>
        </div>
      )}

      {error && <p className="mt-4 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:bg-rose-900/30 dark:text-rose-300">{error}</p>}

      <div className="mt-6 flex items-center justify-between">
        <button type="button" className="btn-ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0 || busy}>
          上一步
        </button>
        {step < 2 ? (
          <button type="button" className="btn-primary" onClick={() => { setError(null); setStep((s) => s + 1); }}>
            下一步
          </button>
        ) : (
          <button type="button" className="btn-primary" onClick={submit} disabled={busy}>
            {busy && <Spinner />}
            生成我的计划
          </button>
        )}
      </div>
    </div>
  );
}
