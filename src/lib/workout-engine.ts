// 训练计划生成引擎(纯函数,可测试)
// 思路:按(经验水平, 每周训练天数)选择周模板 → 沿周期轮转出每一天的训练/休息日,
// 再按可用器械与水平筛选动作,生成 热身/力量/有氧/拉伸 四个区块。

import { EXERCISES, EXERCISE_MAP, toItem, type Exercise } from "./exercises";
import type { BlockItem, Intensity, PlanBlocks, PlanDayData, ProfileInput, WeekDayDef } from "@/types";
import { addDays, dateKey, hashSeed, parseDateKey } from "./utils";

type TemplateId = "fb_a" | "fb_b" | "upper" | "lower" | "push" | "pull" | "legs" | "core_cardio";

interface SlotDef {
  /** 候选动作 id,按优先级排列,运行时按器械/水平挑选 */
  pool: string[];
}

interface TemplateDef {
  title: string;
  slots: SlotDef[];
  cardioId: string[];
  /** 增肌模式下额外追加的孤立动作槽位 */
  bulkSlots?: SlotDef[];
}

const TEMPLATES: Record<TemplateId, TemplateDef> = {
  fb_a: {
    title: "全身力量 A(下肢+推)",
    slots: [
      { pool: ["s-squat", "s-db-goblet-squat", "s-leg-press", "s-wall-sit"] },
      { pool: ["s-pushup", "s-incline-pushup", "s-db-floor-press", "s-machine-press", "s-bb-bench-press"] },
      { pool: ["s-db-row", "s-band-row", "s-water-row", "s-seated-row", "s-lat-pulldown"] },
      { pool: ["s-glute-bridge", "s-calf-raise"] },
      { pool: ["s-plank", "s-dead-bug"] },
    ],
    bulkSlots: [{ pool: ["s-bb-squat", "s-db-goblet-squat"] }, { pool: ["s-calf-raise", "s-db-lateral-raise"] }],
    cardioId: ["c-brisk-walk", "c-bike", "c-elliptical", "c-stairs"],
  },
  fb_b: {
    title: "全身力量 B(髋铰链+拉)",
    slots: [
      { pool: ["s-rdl", "s-db-goblet-squat", "s-lunge", "s-glute-bridge"] },
      { pool: ["s-db-row", "s-band-row", "s-seated-row", "s-lat-pulldown", "s-water-row"] },
      { pool: ["s-db-shoulder-press", "s-pike-pushup", "s-machine-press", "s-pushup"] },
      { pool: ["s-db-curl", "s-dips-chair"] },
      { pool: ["s-dead-bug", "s-side-plank", "s-crunch"] },
    ],
    bulkSlots: [{ pool: ["s-bb-row", "s-db-row"] }, { pool: ["s-hammer-curl", "s-db-curl"] }],
    cardioId: ["c-brisk-walk", "c-jump-rope", "c-bike", "c-jog"],
  },
  upper: {
    title: "上肢力量(推+拉)",
    slots: [
      { pool: ["s-pushup", "s-db-floor-press", "s-bb-bench-press", "s-machine-press", "s-incline-pushup"] },
      { pool: ["s-db-row", "s-band-row", "s-seated-row", "s-lat-pulldown"] },
      { pool: ["s-db-shoulder-press", "s-pike-pushup"] },
      { pool: ["s-db-curl", "s-dips-chair"] },
      { pool: ["s-plank", "s-side-plank"] },
    ],
    bulkSlots: [{ pool: ["s-bb-bench-press", "s-cable-fly"] }, { pool: ["s-bb-row", "s-hammer-curl"] }],
    cardioId: ["c-bike", "c-elliptical", "c-brisk-walk"],
  },
  lower: {
    title: "下肢力量(腿臀)",
    slots: [
      { pool: ["s-squat", "s-db-goblet-squat", "s-leg-press"] },
      { pool: ["s-rdl", "s-glute-bridge"] },
      { pool: ["s-lunge", "s-bulgarian"] },
      { pool: ["s-calf-raise"] },
      { pool: ["s-wall-sit", "s-superman"] },
    ],
    bulkSlots: [{ pool: ["s-bb-squat", "s-db-goblet-squat"] }, { pool: ["s-leg-press", "s-calf-raise"] }],
    cardioId: ["c-brisk-walk", "c-bike", "c-stairs", "c-elliptical"],
  },
  push: {
    title: "推日(胸肩三头)",
    slots: [
      { pool: ["s-db-floor-press", "s-bb-bench-press", "s-machine-press", "s-pushup"] },
      { pool: ["s-db-shoulder-press", "s-pike-pushup"] },
      { pool: ["s-incline-pushup", "s-pushup", "s-dips-chair"] },
      { pool: ["s-dips-chair", "s-db-curl"] },
    ],
    bulkSlots: [{ pool: ["s-cable-fly", "s-db-lateral-raise"] }, { pool: ["s-db-lateral-raise", "s-cable-fly"] }],
    cardioId: ["c-elliptical", "c-bike", "c-jog", "c-brisk-walk"],
  },
  pull: {
    title: "拉日(背二头)",
    slots: [
      { pool: ["s-lat-pulldown", "s-pullup", "s-band-row", "s-db-row"] },
      { pool: ["s-seated-row", "s-db-row", "s-band-row"] },
      { pool: ["s-db-curl"] },
      { pool: ["s-superman", "s-dead-bug"] },
    ],
    bulkSlots: [{ pool: ["s-bb-row", "s-hammer-curl"] }, { pool: ["s-hammer-curl", "s-bb-row"] }],
    cardioId: ["c-bike", "c-brisk-walk", "c-stairs"],
  },
  legs: {
    title: "腿日(力量+有氧)",
    slots: [
      { pool: ["s-squat", "s-db-goblet-squat", "s-leg-press"] },
      { pool: ["s-rdl"] },
      { pool: ["s-lunge", "s-bulgarian"] },
      { pool: ["s-glute-bridge", "s-calf-raise"] },
    ],
    cardioId: ["c-bike", "c-elliptical", "c-jog"],
  },
  core_cardio: {
    title: "核心 + 有氧",
    slots: [
      { pool: ["s-plank", "s-dead-bug"] },
      { pool: ["s-crunch", "s-side-plank"] },
      { pool: ["s-mountain", "s-glute-bridge"] },
    ],
    cardioId: ["c-hiit", "c-jump-rope", "c-jog", "c-brisk-walk"],
  },
};

/** 周内周一..周日的模板排布;rest 表示休息日(训练条目数 = 每周可训练天数) */
const WEEK_PLAN: Record<string, (TemplateId | "rest")[]> = {
  "beginner-1": ["fb_a", "rest", "rest", "rest", "rest", "rest", "rest"],
  "beginner-2": ["fb_a", "rest", "rest", "fb_b", "rest", "rest", "rest"],
  "beginner-3": ["fb_a", "rest", "fb_b", "rest", "core_cardio", "rest", "rest"],
  "beginner-4": ["fb_a", "rest", "fb_b", "rest", "upper", "rest", "lower"],
  "beginner-5": ["fb_a", "core_cardio", "fb_b", "rest", "upper", "rest", "lower"],
  "beginner-6": ["fb_a", "core_cardio", "fb_b", "core_cardio", "upper", "rest", "lower"],
  "beginner-7": ["fb_a", "core_cardio", "fb_b", "core_cardio", "upper", "lower", "core_cardio"],
  "intermediate-2": ["fb_a", "rest", "rest", "fb_b", "rest", "rest", "rest"],
  "intermediate-3": ["push", "rest", "pull", "rest", "legs", "rest", "rest"],
  "intermediate-4": ["upper", "rest", "lower", "rest", "push", "rest", "pull"],
  "intermediate-5": ["upper", "lower", "rest", "push", "rest", "pull", "legs"],
  "intermediate-6": ["push", "pull", "legs", "upper", "rest", "lower", "core_cardio"],
  "intermediate-7": ["push", "pull", "legs", "upper", "lower", "core_cardio", "core_cardio"],
  "advanced-2": ["fb_a", "rest", "rest", "fb_b", "rest", "rest", "rest"],
  "advanced-3": ["push", "rest", "pull", "rest", "legs", "rest", "rest"],
  "advanced-4": ["push", "pull", "rest", "legs", "rest", "upper", "rest"],
  "advanced-5": ["push", "pull", "legs", "rest", "upper", "rest", "core_cardio"],
  "advanced-6": ["push", "pull", "legs", "push", "pull", "rest", "legs"],
  "advanced-7": ["push", "pull", "legs", "upper", "lower", "push", "pull"],
};

function weekKey(p: ProfileInput): string {
  return `${p.experience}-${Math.min(7, Math.max(1, p.trainingDaysPerWeek))}`;
}

function equipmentOk(e: Exercise, equipment: string[]): boolean {
  return e.equipment.some((eq) => eq === "none" || equipment.includes(eq));
}

/** 从候选池中挑第一个可用动作(考虑器械与水平),全不可用时退化为任意可用同类型动作 */
function pickFromPool(pool: string[], p: ProfileInput, used: Set<string>): Exercise | null {
  const level = p.experience === "advanced" ? 3 : p.experience === "intermediate" ? 2 : 1;
  const avail = pool.map((id) => EXERCISE_MAP[id]).filter((e): e is Exercise => Boolean(e));
  const ok = avail.filter((e) => equipmentOk(e, p.equipment) && e.level <= level && !used.has(e.id));
  const fallback = avail.filter((e) => equipmentOk(e, p.equipment) && e.level <= level);
  const chosen = ok[0] ?? fallback[0] ?? null;
  if (chosen) used.add(chosen.id);
  return chosen;
}

function pickCardio(ids: string[], p: ProfileInput, seed: number): Exercise | null {
  const level = p.experience === "advanced" ? 3 : p.experience === "intermediate" ? 2 : 1;
  const avail = ids
    .map((id) => EXERCISE_MAP[id])
    .filter((e): e is Exercise => Boolean(e))
    .filter((e) => equipmentOk(e, p.equipment) && e.level <= level);
  if (avail.length === 0) return EXERCISE_MAP["c-brisk-walk"] ?? null;
  return avail[seed % avail.length];
}

/** 水平 → 力量组数/次数/休息;增肌模式偏向肌肥大区间(6-12 次、组数+1、休息更长) */
function volume(e: Exercise, p: ProfileInput) {
  const bulk = p.goal === "bulk";
  const conf = {
    beginner: { sets: 3, restSec: 60 },
    intermediate: { sets: e.unit === "reps" ? 3 : 4, restSec: 75 },
    advanced: { sets: 4, restSec: 90 },
  }[p.experience];
  let sets = conf.sets;
  let restSec = conf.restSec;
  let reps = e.reps;
  if (p.experience === "advanced" && e.unit === "reps" && e.level === 3) reps = Math.max(6, reps - 2);
  if (p.experience === "beginner" && e.unit === "reps" && e.level === 1) reps = reps + 2;
  if (bulk && e.type === "strength") {
    sets = Math.min(5, sets + 1);
    if (e.unit === "reps") {
      reps = clampNum(reps, 8, 12); // 肌肥大次数区间
      restSec = Math.max(restSec, 90);
    }
  }
  return { sets, restSec, reps };
}

function clampNum(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** 有氧时长(分钟)按强度档调整;增肌模式减半并封顶 20 分钟(保留心肺维护,不吃掉热量盈余) */
function cardioMinutes(e: Exercise, intensity: Intensity, seed: number, bulk = false): number {
  const base = e.reps; // 15-30
  const jitter = (seed % 3) * 5;
  let m = Math.max(12, base - 5 + jitter);
  if (intensity === "light") m = Math.round(m * 0.66);
  if (intensity === "plus") m = Math.round(m * 1.25);
  if (bulk) m = Math.min(20, Math.round(m * 0.5));
  return Math.min(45, m);
}

function scaleBlockItems(items: BlockItem[], intensity: Intensity): BlockItem[] {
  return items.map((it) => {
    if (it.kind === "cardio") return { ...it, repsOrDuration: it.repsOrDuration ?? 0 };
    if (intensity === "light" && it.unit === "reps" && it.sets) {
      return { ...it, sets: Math.max(2, it.sets - 1), repsOrDuration: Math.max(6, (it.repsOrDuration ?? 0) - 2) };
    }
    if (intensity === "plus" && it.sets) {
      return { ...it, sets: Math.min(6, it.sets + 1) };
    }
    return it;
  });
}

const WARMUP_IDS = ["w-jumping-jack", "w-high-knees", "w-arm-circle", "w-hip-circle", "w-cat-cow", "w-leg-swing"];
const STRETCH_IDS = ["x-hamstring", "x-quad", "x-hip-flexor", "x-child-pose", "x-shoulder", "x-cat-cow-x"];

/** 从池中轮转挑选 count 个动作,并按可用器械过滤 */
function pickRotate(ids: string[], count: number, seed: number, equipment: string[] = ["none"]): Exercise[] {
  const avail = ids.filter((id) => {
    const e = EXERCISE_MAP[id];
    return e && e.equipment.some((eq) => eq === "none" || equipment.includes(eq));
  });
  const pool = avail.length > 0 ? avail : ids.filter((id) => EXERCISE_MAP[id]);
  const out: Exercise[] = [];
  for (let i = 0; i < count; i++) {
    const e = EXERCISE_MAP[pool[(seed + i) % pool.length]];
    if (e) out.push(e);
  }
  return out;
}

/** 生成单个训练日(不落库) */
export function buildTrainingDay(
  p: ProfileInput,
  dateKeyStr: string,
  templateId: TemplateId,
  seedBase: number,
  intensity: Intensity = "standard"
): PlanDayData {
  const tpl = TEMPLATES[templateId];
  const seed = hashSeed(`${p.experience}${p.place}${dateKeyStr}${templateId}${seedBase}`);
  const used = new Set<string>();

  const warmup: BlockItem[] = pickRotate(WARMUP_IDS, 3, seed, p.equipment).map(toItem);
  const strength: BlockItem[] = [];
  const slots = p.goal === "bulk" && tpl.bulkSlots ? [...tpl.slots, ...tpl.bulkSlots] : tpl.slots;
  for (const slot of slots) {
    const ex = pickFromPool(slot.pool, p, used);
    if (ex) {
      const v = volume(ex, p);
      strength.push({ ...toItem(ex), sets: v.sets, repsOrDuration: v.reps, restSec: v.restSec });
    }
  }
  const cardioEx = pickCardio(tpl.cardioId, p, seed);
  const cardioMin = cardioEx ? cardioMinutes(cardioEx, intensity, seed, p.goal === "bulk") : 20;
  const cardio: BlockItem[] = cardioEx
    ? [{ ...toItem(cardioEx), repsOrDuration: cardioMin, unit: "minutes", sets: 1, restSec: 0 }]
    : [];
  const stretch: BlockItem[] = pickRotate(STRETCH_IDS, 3, seed + 2, p.equipment).map(toItem);

  const blocks: PlanBlocks = scaleBlockItemsAll({ warmup, strength, cardio, stretch }, intensity);

  // 粗略总时长
  const strengthMin = strength.reduce((s, it) => s + (it.sets ?? 3) * ((it.unit === "seconds" ? 1 : 0.75) + (it.restSec ?? 60) / 60), 0);
  const durationMin = Math.round(6 + strengthMin + cardioMin + 8);

  return { date: dateKeyStr, isTraining: true, focus: tpl.title, durationMin, blocks };
}

function scaleBlockItemsAll(blocks: PlanBlocks, intensity: Intensity): PlanBlocks {
  return {
    warmup: blocks.warmup.map((it) =>
      intensity === "light" && it.unit === "seconds" ? { ...it, repsOrDuration: Math.round((it.repsOrDuration ?? 0) * 0.8) } : it
    ),
    strength: scaleBlockItems(blocks.strength, intensity),
    cardio: blocks.cardio,
    stretch: blocks.stretch,
  };
}

/** 恢复日:散步 + 轻拉伸 */
export function buildRestDay(p: ProfileInput, dateKeyStr: string, seedBase: number): PlanDayData {
  const seed = hashSeed(`rest${dateKeyStr}${seedBase}`);
  const walk = EXERCISE_MAP["c-brisk-walk"];
  const stretch = pickRotate(STRETCH_IDS, 3, seed, p.equipment).map((e) => ({ ...toItem(e), sets: 1 }));
  return {
    date: dateKeyStr,
    isTraining: false,
    focus: "恢复日 · 散步与拉伸",
    durationMin: 30,
    blocks: {
      warmup: [],
      strength: [],
      cardio: walk ? [{ ...toItem(walk), name: "轻松散步", repsOrDuration: 20, tips: ["无负担的节奏", "可以拆成两次完成"] }] : [],
      stretch,
    },
  };
}

/** 从自定义周模板的某一天生成计划日(template 型走模板;custom 型直接用用户动作清单) */
export function buildDayFromWeekDef(p: ProfileInput, def: WeekDayDef, dateKeyStr: string, seedBase: number): PlanDayData {
  if (def.type === "rest") return buildRestDay(p, dateKeyStr, seedBase);
  if (def.type === "custom") {
    // 直接采用用户编辑的区块(按当天强度档不再缩放,尊重手动结果)
    const strengthMin = def.blocks.strength.reduce(
      (s, it) => s + (it.sets ?? 3) * ((it.unit === "seconds" ? 1 : 0.75) + (it.restSec ?? 60) / 60),
      0
    );
    const cardioMin = def.blocks.cardio.reduce((s, c) => s + (c.repsOrDuration ?? 0), 0);
    return {
      date: dateKeyStr,
      isTraining: true,
      focus: def.focus,
      durationMin: Math.round(6 + strengthMin + cardioMin + 8),
      blocks: def.blocks,
    };
  }
  return buildTrainingDay(p, dateKeyStr, def.templateId as TemplateId, seedBase);
}

/** 生成整个周期的训练日历(启用自定义周模板时优先使用它) */
export function generatePlan(p: ProfileInput, startDateKey: string, seedBase = 0): PlanDayData[] {
  const useCustom = Boolean(p.customWeekEnabled && p.customWeek && p.customWeek.length === 7);
  const week: (TemplateId | "rest")[] = useCustom ? [] : WEEK_PLAN[weekKey(p)] ?? WEEK_PLAN["beginner-3"];
  const start = parseDateKey(startDateKey);
  const out: PlanDayData[] = [];
  for (let i = 0; i < p.durationDays; i++) {
    const d = addDays(start, i);
    const dow = (d.getUTCDay() + 6) % 7; // 周一=0
    let day: PlanDayData;
    if (useCustom) {
      day = buildDayFromWeekDef(p, p.customWeek![dow], dateKey(d), seedBase);
    } else {
      const tplId = week[dow];
      day = tplId === "rest" ? buildRestDay(p, dateKey(d), seedBase) : buildTrainingDay(p, dateKey(d), tplId, seedBase);
    }
    out.push(day);
  }
  return out;
}

/** 应用新的强度档:重新缩放现有区块数值(保留用户手动改过的结构) */
export function rescaleBlocks(blocks: PlanBlocks, intensity: Intensity): PlanBlocks {
  return scaleBlockItemsAll(blocks, intensity);
}

/** 统计每个动作的替换建议(供前端) */
export function suggestReplacements(exerciseId: string, p: ProfileInput): string[] {
  const level = p.experience === "advanced" ? 3 : p.experience === "intermediate" ? 2 : 1;
  const src = EXERCISE_MAP[exerciseId];
  if (!src) return [];
  return EXERCISES.filter(
    (e) => e.id !== src.id && e.type === src.type && e.muscle === src.muscle && e.level <= level && equipmentOk(e, p.equipment)
  ).map((e) => e.id);
}

export { TEMPLATES, WEEK_PLAN };
