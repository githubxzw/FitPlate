"use client";

// 用户信息问卷:基本信息 → 目标与训练 → 饮食偏好,最后一步可预览推导结果

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Spinner, Badge } from "@/components/ui";
import { ALLERGY_OPTIONS, DEFAULT_GYM_EQUIPMENT, DEFAULT_HOME_EQUIPMENT, DIET_PREF_OPTIONS, EQUIPMENT_OPTIONS, FLAG_OPTIONS } from "@/lib/constants";
import { calcBMR, activityFactor } from "@/lib/calc";
import { cn } from "@/lib/utils";

export interface ProfileFormState {
  sex: "male" | "female";
  age: number;
  heightCm: number;
  weightKg: number;
  bodyFatPct: string;
  goalWeightKg: number;
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
}

export const DEFAULT_FORM: ProfileFormState = {
  sex: "male",
  age: 28,
  heightCm: 172,
  weightKg: 70,
  bodyFatPct: "",
  goalWeightKg: 65,
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
};

export function toggle(list: string[], v: string): string[] {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
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

export function OnboardingForm({ initial }: { initial?: Partial<ProfileFormState> }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dislikeInput, setDislikeInput] = useState("");
  const [f, setF] = useState<ProfileFormState>({ ...DEFAULT_FORM, ...initial });

  const set = <K extends keyof ProfileFormState>(k: K, v: ProfileFormState[K]) => setF((p) => ({ ...p, [k]: v }));

  const preview = useMemo(() => {
    const bmr = calcBMR({
      sex: f.sex,
      age: Number(f.age),
      heightCm: Number(f.heightCm),
      weightKg: Number(f.weightKg),
      bodyFatPct: f.bodyFatPct ? Number(f.bodyFatPct) : null,
    });
    const tdee = bmr * activityFactor(Number(f.trainingDaysPerWeek));
    return { bmr: Math.round(bmr), tdee: Math.round(tdee) };
  }, [f.sex, f.age, f.heightCm, f.weightKg, f.bodyFatPct, f.trainingDaysPerWeek]);

  function changePlace(place: "home" | "gym") {
    setF((p) => ({
      ...p,
      place,
      equipment: place === "gym" ? DEFAULT_GYM_EQUIPMENT : DEFAULT_HOME_EQUIPMENT,
    }));
  }

  async function submit() {
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
      if (!res.ok) throw new Error(json.error ?? "保存失败");
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
              <input id="age" type="number" className="input" min={13} max={90} value={f.age} onChange={(e) => set("age", Number(e.target.value))} />
            </div>
            <div>
              <label className="label" htmlFor="height">身高(cm)</label>
              <input id="height" type="number" className="input" min={120} max={230} value={f.heightCm} onChange={(e) => set("heightCm", Number(e.target.value))} />
            </div>
            <div>
              <label className="label" htmlFor="weight">体重(kg)</label>
              <input id="weight" type="number" step="0.1" className="input" min={30} max={250} value={f.weightKg} onChange={(e) => set("weightKg", Number(e.target.value))} />
            </div>
            <div className="col-span-2">
              <label className="label" htmlFor="bodyfat">体脂率(%)- 可选</label>
              <input id="bodyfat" type="number" step="0.1" className="input" min={3} max={70} placeholder="不知道可以留空" value={f.bodyFatPct} onChange={(e) => set("bodyFatPct", e.target.value)} />
            </div>
          </div>
          <p className="text-xs text-zinc-400">填写体脂率可以用更精确的公式估算代谢,不确定就留空。</p>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="goal">目标体重(kg)</label>
              <input id="goal" type="number" step="0.1" className="input" min={30} max={250} value={f.goalWeightKg} onChange={(e) => set("goalWeightKg", Number(e.target.value))} />
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
              <Badge tone="sky">预估基础代谢 ≈ {preview.bmr} kcal</Badge>
              <Badge tone="emerald">预估每日消耗 ≈ {preview.tdee} kcal</Badge>
            </div>
            <p className="mt-2 text-xs text-zinc-400">保存后系统会按缺口给出每日热量与蛋白质目标;所有数值仅供参考。</p>
          </div>
        </div>
      )}

      {error && <p className="mt-4 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:bg-rose-900/30 dark:text-rose-300">{error}</p>}

      <div className="mt-6 flex items-center justify-between">
        <button type="button" className="btn-ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0 || busy}>
          上一步
        </button>
        {step < 2 ? (
          <button type="button" className="btn-primary" onClick={() => setStep((s) => s + 1)}>
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
