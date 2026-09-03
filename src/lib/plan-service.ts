// 计划编排服务:把「生成引擎」和「数据库」连接起来(仅服务端使用)

import { db } from "./db";
import { deriveTargets } from "./calc";
import { generatePlan, buildTrainingDay, buildRestDay, buildDayFromWeekDef } from "./workout-engine";
import { generateMealDay, replaceSlot as engineReplaceSlot, rescaleSlot } from "./meal-engine";
import { WEEK_PLAN } from "./workout-engine";
import { mealSources, planSources } from "./search";
import { coachTips, aiEnabled, ruleTips } from "./ai";
import type { MealDayData, MealSlotType, PlanBlocks, PlanDayData, ProfileInput } from "@/types";
import type { Profile } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { addDays, dateKey, hashSeed, parseDateKey, todayKey, fromJson } from "./utils";
import type { Intensity } from "@/types";

/** 接口类型缺少索引签名,写入 Json 字段前统一断言 */
function asJson<T>(value: T): Prisma.InputJsonValue {
  return value as unknown as Prisma.InputJsonValue;
}

export function profileToInput(profile: Profile): ProfileInput {
  return {
    sex: profile.sex as ProfileInput["sex"],
    age: profile.age,
    heightCm: profile.heightCm,
    weightKg: profile.weightKg,
    bodyFatPct: profile.bodyFatPct,
    goalWeightKg: profile.goalWeightKg,
    durationDays: profile.durationDays,
    experience: profile.experience as ProfileInput["experience"],
    trainingDaysPerWeek: profile.trainingDaysPerWeek,
    place: profile.place as ProfileInput["place"],
    equipment: profile.equipment,
    dietPrefs: profile.dietPrefs,
    allergies: profile.allergies,
    disliked: profile.disliked,
    budgetYuan: profile.budgetYuan,
    cookMinutes: profile.cookMinutes,
    flags: profile.flags,
    goal: (profile.goal as ProfileInput["goal"]) ?? "cut",
    customWeek: profile.customWeek ? fromJson<ProfileInput["customWeek"]>(profile.customWeek) : undefined,
    customWeekEnabled: profile.customWeekEnabled,
  };
}

export function targetsFor(profile: Profile) {
  return deriveTargets(profileToInput(profile));
}

/** 用户计划窗口(含结束日期) */
export function planWindow(profile: Profile): { from: string; to: string } {
  const from = dateKey(profile.startDate);
  const to = dateKey(addDays(parseDateKey(from), profile.durationDays - 1));
  return { from, to };
}

/** 重新生成整个周期(从 fromKey 开始),替换已存在的未打卡记录 */
export async function regenerateAllPlanDays(userId: string, profile: Profile, fromKey?: string, seedBase?: number) {
  const p = profileToInput(profile);
  const start = fromKey ?? (parseDateKey(dateKey(profile.startDate)) < parseDateKey(todayKey()) ? todayKey() : dateKey(profile.startDate));
  const seed = seedBase ?? hashSeed(`${userId}${Date.now()}`) % 100000;
  const days = generatePlan(p, start, seed);
  const dates = days.map((d) => parseDateKey(d.date));

  // 保留已打卡的日期(不覆盖用户进度)
  const existing = await db.planDay.findMany({ where: { userId, date: { gte: parseDateKey(start) } } });
  const keep = new Map(existing.filter((e) => e.completed).map((e) => [dateKey(e.date), e]));
  const staleIds = existing.filter((e) => !e.completed).map((e) => e.id);
  if (staleIds.length > 0) {
    await db.planDay.deleteMany({ where: { id: { in: staleIds } } });
  }

  const rows = days
    .filter((d) => !keep.has(d.date))
    .map((d) => ({
      userId,
      date: parseDateKey(d.date),
      isTraining: d.isTraining,
      focus: d.focus,
      blocks: asJson(d.blocks),
      aiTips: d.isTraining && aiEnabled() ? undefined : ruleTips(d.focus, p.goal), // AI 建议按需生成,先给规则提示
      sources: asJson(planSources()),
      seed,
    }));

  await db.planDay.createMany({ data: rows, skipDuplicates: false });
  return { from: start, count: days.length, skippedCompleted: keep.size, dates };
}

export async function regeneratePlanDay(userId: string, profile: Profile, dateKeyStr: string, seedBase?: number) {
  const p = profileToInput(profile);
  const d = parseDateKey(dateKeyStr);
  const dow = (d.getUTCDay() + 6) % 7;
  const useCustom = Boolean(p.customWeekEnabled && p.customWeek && p.customWeek.length === 7);
  const seed = seedBase ?? hashSeed(`${userId}${dateKeyStr}re${Math.floor(Math.random() * 1e6)}`) % 100000;
  let day: PlanDayData;
  if (useCustom) {
    day = buildDayFromWeekDef(p, p.customWeek![dow], dateKeyStr, seed);
  } else {
    const weekKey = `${p.experience}-${Math.min(7, Math.max(1, p.trainingDaysPerWeek))}`;
    const tplId = (WEEK_PLAN[weekKey] ?? WEEK_PLAN["beginner-3"])[dow];
    day = tplId === "rest" ? buildRestDay(p, dateKeyStr, seed) : buildTrainingDay(p, dateKeyStr, tplId as never, seed);
  }

  await db.planDay.upsert({
    where: { userId_date: { userId, date: d } },
    create: {
      userId,
      date: d,
      isTraining: day.isTraining,
      focus: day.focus,
      blocks: asJson(day.blocks),
      aiTips: ruleTips(day.focus, p.goal),
      sources: asJson(planSources()),
      seed,
    },
    update: {
      isTraining: day.isTraining,
      focus: day.focus,
      blocks: asJson(day.blocks),
      intensity: "standard",
      aiTips: ruleTips(day.focus, p.goal),
      sources: asJson(planSources()),
      seed,
      completed: false,
      completedAt: null,
    },
  });
  return day;
}

export async function regenerateAllMealDays(userId: string, profile: Profile, fromKey?: string, seedBase?: number) {
  const p = profileToInput(profile);
  const targets = targetsFor(profile);
  const start =
    fromKey ?? (parseDateKey(dateKey(profile.startDate)) < parseDateKey(todayKey()) ? todayKey() : dateKey(profile.startDate));
  const seed = seedBase ?? hashSeed(`meal${userId}${Date.now()}`) % 100000;

  const existing = await db.mealDay.findMany({ where: { userId, date: { gte: parseDateKey(start) } } });
  const completedSlots = new Map<string, string[]>();
  for (const e of existing) {
    if (e.completedSlots.length > 0) completedSlots.set(dateKey(e.date), e.completedSlots);
  }
  const staleIds = existing.filter((e) => e.completedSlots.length === 0).map((e) => e.id);
  if (staleIds.length > 0) await db.mealDay.deleteMany({ where: { id: { in: staleIds } } });

  const usedIds = new Set<string>();
  for (let i = 0; i < profile.durationDays; i++) {
    const key = dateKey(addDays(parseDateKey(start), i));
    const data = generateMealDay(p, key, targets, seed, usedIds);
    for (const slot of Object.values(data)) usedIds.add(slot.recipeId);

    const keep = completedSlots.get(key) ?? [];
    await db.mealDay.upsert({
      where: { userId_date: { userId, date: parseDateKey(key) } },
      create: {
        userId,
        date: parseDateKey(key),
        targetKcal: targets.targetKcal,
        targetProtein: targets.protein,
        targetCarbs: targets.carbs,
        targetFat: targets.fat,
        slots: asJson(data),
        sources: asJson(mealSources()),
        seed,
        completedSlots: keep,
      },
      update: {
        targetKcal: targets.targetKcal,
        targetProtein: targets.protein,
        targetCarbs: targets.carbs,
        targetFat: targets.fat,
        slots: asJson(data),
        sources: asJson(mealSources()),
        seed,
      },
    });
  }
  return { from: start, count: profile.durationDays };
}

export async function regenerateMealDay(userId: string, profile: Profile, dateKeyStr: string, seedBase?: number) {
  const p = profileToInput(profile);
  const targets = targetsFor(profile);
  const existing = await db.mealDay.findUnique({ where: { userId_date: { userId, date: parseDateKey(dateKeyStr) } } });
  const exclude = new Set<string>(existing ? Object.values(fromJson<MealDayData>(existing.slots)).map((s) => s.recipeId) : []);
  const seed = seedBase ?? hashSeed(`meald${userId}${dateKeyStr}${Math.floor(Math.random() * 1e6)}`) % 100000;
  const data = generateMealDay(p, dateKeyStr, targets, seed);
  // 与旧内容错开:逐槽位在候选中避让(引擎已按 usedIds 优先取新)
  if (existing) {
    const fresh = { ...data };
    for (const slotName of ["breakfast", "lunch", "dinner", "snack"] as MealSlotType[]) {
      if (fresh[slotName].recipeId === (fromJson<MealDayData>(existing.slots))[slotName]?.recipeId) {
        fresh[slotName] = engineReplaceSlot(p, dateKeyStr, slotName, targets, [...exclude]);
      }
    }
    await db.mealDay.update({ where: { userId_date: { userId, date: parseDateKey(dateKeyStr) } }, data: { slots: asJson(fresh), seed } });
    return fresh;
  }
  const targetsRow = targets;
  await db.mealDay.create({
    data: {
      userId,
      date: parseDateKey(dateKeyStr),
      targetKcal: targetsRow.targetKcal,
      targetProtein: targetsRow.protein,
      targetCarbs: targetsRow.carbs,
      targetFat: targetsRow.fat,
      slots: asJson(data),
      sources: asJson(mealSources()),
      seed,
    },
  });
  return data;
}

export async function replaceMealSlot(
  userId: string,
  profile: Profile,
  dateKeyStr: string,
  slot: MealSlotType,
  excludeIds: string[] = []
) {
  const p = profileToInput(profile);
  const targets = targetsFor(profile);
  const existing = await db.mealDay.findUnique({ where: { userId_date: { userId, date: parseDateKey(dateKeyStr) } } });
  if (!existing) throw new Error("该日期还没有饮食计划");
  const slots = fromJson<MealDayData>(existing.slots);
  const exclude = [...excludeIds, slots[slot].recipeId, ...Object.values(slots).map((s) => s.recipeId)];
  const updated = { ...slots, [slot]: engineReplaceSlot(p, dateKeyStr, slot, targets, [...new Set(exclude)]) };
  await db.mealDay.update({ where: { userId_date: { userId, date: parseDateKey(dateKeyStr) } }, data: { slots: asJson(updated) } });
  return updated[slot];
}

export async function scaleMealSlot(userId: string, dateKeyStr: string, slot: MealSlotType, scale: number) {
  const existing = await db.mealDay.findUnique({ where: { userId_date: { userId, date: parseDateKey(dateKeyStr) } } });
  if (!existing) throw new Error("该日期还没有饮食计划");
  const slots = fromJson<MealDayData>(existing.slots);
  const updated = { ...slots, [slot]: rescaleSlot(slots[slot], scale) };
  await db.mealDay.update({ where: { userId_date: { userId, date: parseDateKey(dateKeyStr) } }, data: { slots: asJson(updated) } });
  return updated[slot];
}

/** AI 教练建议(按需生成并缓存到当天计划;失败回退规则提示) */
export async function ensureAiTips(userId: string, profile: Profile, dateKeyStr: string): Promise<string[]> {
  const p = profileToInput(profile);
  const day = await db.planDay.findUnique({ where: { userId_date: { userId, date: parseDateKey(dateKeyStr) } } });
  if (!day) return ruleTips("训练", p.goal);
  if (Array.isArray(day.aiTips) && day.aiTips.length > 0) return fromJson<string[]>(day.aiTips);
  const targets = targetsFor(profile);
  const tips = aiEnabled()
    ? await coachTips({
        sex: profile.sex,
        age: profile.age,
        experience: profile.experience,
        goal: `${profile.weightKg}kg→${profile.goalWeightKg}kg`,
        audienceGoal: p.goal ?? "cut",
        focus: day.focus,
        targetKcal: targets.targetKcal,
        protein: targets.protein,
      })
    : ruleTips(day.focus, p.goal);
  await db.planDay.update({ where: { id: day.id }, data: { aiTips: tips } });
  return tips;
}

/** 更新单日训练内容(用户编辑组数/次数/休息,或强度档) */
export async function updatePlanDay(
  userId: string,
  dateKeyStr: string,
  patch: { intensity?: Intensity; blocks?: PlanBlocks; completed?: boolean }
) {
  const date = parseDateKey(dateKeyStr);
  const data: Record<string, unknown> = {};
  if (patch.intensity) data.intensity = patch.intensity;
  if (patch.blocks) data.blocks = asJson(patch.blocks);
  if (patch.completed !== undefined) {
    data.completed = patch.completed;
    data.completedAt = patch.completed ? new Date() : null;
  }
  return db.planDay.update({ where: { userId_date: { userId, date } }, data });
}

export async function toggleMealSlot(userId: string, dateKeyStr: string, slot: MealSlotType, value: boolean) {
  const date = parseDateKey(dateKeyStr);
  const existing = await db.mealDay.findUnique({ where: { userId_date: { userId, date } } });
  if (!existing) throw new Error("该日期还没有饮食计划");
  const set = new Set(existing.completedSlots);
  if (value) set.add(slot);
  else set.delete(slot);
  return db.mealDay.update({ where: { userId_date: { userId, date } }, data: { completedSlots: [...set] } });
}
