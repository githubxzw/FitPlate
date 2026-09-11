// 种子数据:默认创建一个演示账号并生成完整周期计划,便于本地快速体验
// 运行:npm run db:seed
// ⚠️ 安全:演示账号的邮箱密码是公开写在源码里的。生产环境禁止执行本脚本;
//    如确需演示数据,显式设置 SEED_DEMO=1(见 docs/DEPLOY.md)
// 演示账号:demo@fitplate.app / fitplate123(仅限本地开发)

import { PrismaClient, Prisma } from "@prisma/client";
import { hashPassword } from "../src/lib/password";
import { deriveTargets } from "../src/lib/calc";
import { generatePlan } from "../src/lib/workout-engine";
import { generateMealDay } from "../src/lib/meal-engine";
import { planSources, mealSources } from "../src/lib/search";
import { ruleTips } from "../src/lib/ai";
import type { ProfileInput } from "../src/types";
import { addDays, dateKey, hashSeed, parseDateKey, todayKey } from "../src/lib/utils";

const db = new PrismaClient();

/** 接口类型写入 Json 字段前统一断言 */
function asJson<T>(value: T): Prisma.InputJsonValue {
  return value as unknown as Prisma.InputJsonValue;
}

const DEMO_EMAIL = "demo@fitplate.app";
const DEMO_PASSWORD = "fitplate123";

async function main() {
  // 安全护栏:未显式要求演示数据时直接跳过(防止生产环境被公开密码的账号入侵)
  if (process.env.SEED_DEMO !== "1") {
    console.log("⏭️  已跳过演示数据(seed.ts 会创建公开密码的演示账号)。");
    console.log("   本地开发需要演示数据请运行:SEED_DEMO=1 npm run db:seed");
    console.log("   生产环境请直接在页面上注册(受 INVITE_CODE 邀请码保护)。");
    return;
  }

  console.log("→ 创建演示用户 …");
  const passwordHash = hashPassword(DEMO_PASSWORD);
  const user = await db.user.upsert({
    where: { email: DEMO_EMAIL },
    update: {},
    create: { email: DEMO_EMAIL, passwordHash, name: "演示用户" },
  });

  const input: ProfileInput = {
    sex: "male",
    age: 28,
    heightCm: 175,
    weightKg: 78,
    bodyFatPct: 22,
    goalWeightKg: 81,
    durationDays: 30,
    experience: "intermediate",
    trainingDaysPerWeek: 4,
    place: "gym",
    equipment: ["mat", "dumbbell", "band", "bench", "barbell", "machine", "cable", "cardio_machine"],
    dietPrefs: ["高蛋白", "快手菜"],
    allergies: [],
    disliked: ["香菜"],
    budgetYuan: 45,
    cookMinutes: 35,
    flags: [],
    goal: "bulk", // 演示账号展示增肌模式(减脂可自行在问卷里切换)
  };

  console.log("→ 写入档案 …");
  const start = parseDateKey(todayKey());
  // customWeek/customWeekEnabled 为 Json/可选字段,演示账号不预设(使用系统自动模板)
  const { customWeek: _omitWeek, customWeekEnabled: _omitEnabled, ...profileData } = input;
  const profile = await db.profile.upsert({
    where: { userId: user.id },
    update: { ...profileData, startDate: start },
    create: { userId: user.id, ...profileData, startDate: start, onboardedAt: new Date() },
  });

  const targets = deriveTargets(input);
  console.log(
    `→ 目标:BMR ${targets.bmr} kcal / TDEE ${targets.tdee} kcal / 每日摄入 ${targets.targetKcal} kcal(P${targets.protein} C${targets.carbs} F${targets.fat})`
  );

  console.log("→ 生成训练计划 …");
  const planSeed = hashSeed("demo-plan") % 100000;
  const days = generatePlan(input, dateKey(start), planSeed);
  for (const [i, day] of days.entries()) {
    await db.planDay.upsert({
      where: { userId_date: { userId: user.id, date: parseDateKey(day.date) } },
      create: {
        userId: user.id,
        date: parseDateKey(day.date),
        isTraining: day.isTraining,
        focus: day.focus,
        blocks: asJson(day.blocks),
        aiTips: ruleTips(day.focus, input.goal),
        sources: asJson(planSources()),
        seed: planSeed,
        completed: i === 0 || i === 1, // 演示:前两天已完成
        completedAt: i === 0 || i === 1 ? new Date() : null,
      },
      update: {
        isTraining: day.isTraining,
        focus: day.focus,
        blocks: asJson(day.blocks),
        sources: asJson(planSources()),
      },
    });
  }

  console.log("→ 生成饮食计划 …");
  const mealSeed = hashSeed("demo-meal") % 100000;
  const usedIds = new Set<string>();
  for (let i = 0; i < input.durationDays; i++) {
    const key = dateKey(addDays(start, i));
    const data = generateMealDay(input, key, targets, mealSeed, usedIds);
    for (const slot of Object.values(data)) usedIds.add(slot.recipeId);
    await db.mealDay.upsert({
      where: { userId_date: { userId: user.id, date: parseDateKey(key) } },
      create: {
        userId: user.id,
        date: parseDateKey(key),
        targetKcal: targets.targetKcal,
        targetProtein: targets.protein,
        targetCarbs: targets.carbs,
        targetFat: targets.fat,
        slots: asJson(data),
        sources: asJson(mealSources()),
        seed: mealSeed,
        completedSlots: i === 0 ? ["breakfast"] : [],
      },
      update: {
        targetKcal: targets.targetKcal,
        targetProtein: targets.protein,
        targetCarbs: targets.carbs,
        targetFat: targets.fat,
        slots: asJson(data),
        sources: asJson(mealSources()),
      },
    });
  }

  console.log(`✅ 完成。演示账号:${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
  console.log(`   计划周期:${dateKey(start)} 起,共 ${input.durationDays} 天`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
