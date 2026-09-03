// 请求/表单校验 Schema(zod),服务端与客户端共用

import { z } from "zod";
import { ALLERGY_OPTIONS, DIET_PREF_OPTIONS, EQUIPMENT_OPTIONS, TEMPLATE_IDS } from "./constants";

const sexEnum = z.enum(["male", "female"]);
const experienceEnum = z.enum(["beginner", "intermediate", "advanced"]);
const placeEnum = z.enum(["home", "gym"]);
const intensityEnum = z.enum(["light", "standard", "plus"]);
const goalEnum = z.enum(["cut", "bulk", "maintain"]);

export const profileSchema = z.object({
  sex: sexEnum,
  age: z.coerce.number().int().min(13).max(90),
  heightCm: z.coerce.number().min(120).max(230),
  weightKg: z.coerce.number().min(30).max(250),
  bodyFatPct: z.coerce.number().min(3).max(70).nullable().optional(),
  goalWeightKg: z.coerce.number().min(30).max(250),
  durationDays: z.union([z.literal(7), z.literal(14), z.literal(30)]),
  experience: experienceEnum,
  trainingDaysPerWeek: z.coerce.number().int().min(1).max(7),
  place: placeEnum,
  equipment: z.array(z.string().refine((v) => EQUIPMENT_OPTIONS.some((e) => e.value === v))).max(20).default([]),
  dietPrefs: z.array(z.string().refine((v) => DIET_PREF_OPTIONS.includes(v))).max(10).default([]),
  allergies: z.array(z.string().refine((v) => ALLERGY_OPTIONS.includes(v))).max(10).default([]),
  disliked: z.array(z.string().min(1).max(12)).max(20).default([]),
  budgetYuan: z.coerce.number().min(10).max(500),
  cookMinutes: z.coerce.number().int().min(10).max(120),
  flags: z.array(z.enum(["pregnancy", "chronic", "ed_history"])).max(5).default([]),
  goal: goalEnum.default("cut"),
});

export type ProfileForm = z.infer<typeof profileSchema>;

export const intensitySchema = z.enum(["light", "standard", "plus"]);

export const blockItemSchema = z.object({
  exerciseId: z.string().min(1),
  name: z.string().min(1).max(30),
  emoji: z.string().max(8).default("💪"),
  kind: z.enum(["warmup", "strength", "cardio", "stretch"]),
  sets: z.number().int().min(1).max(8).optional(),
  repsOrDuration: z.number().min(1).max(300).optional(),
  unit: z.enum(["reps", "seconds", "minutes"]),
  restSec: z.number().int().min(0).max(300).optional(),
  tips: z.array(z.string().max(80)).max(5).default([]),
});

// 自定义编辑允许更多条目(力量 12 / 有氧 6 / 热身·拉伸 10)
export const planBlocksSchema = z.object({
  warmup: z.array(blockItemSchema).max(10),
  strength: z.array(blockItemSchema).max(12),
  cardio: z.array(blockItemSchema).max(6),
  stretch: z.array(blockItemSchema).max(10),
});

export const dateKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "日期格式应为 YYYY-MM-DD");

export const checkinSchema = z.object({
  date: dateKeySchema,
  kind: z.enum(["workout", "breakfast", "lunch", "dinner", "snack"]),
  value: z.boolean(),
});

export const planPatchSchema = z
  .object({
    date: dateKeySchema,
    intensity: intensitySchema.optional(),
    blocks: planBlocksSchema.optional(),
    completed: z.boolean().optional(),
  })
  .refine((v) => v.intensity !== undefined || v.blocks !== undefined || v.completed !== undefined, {
    message: "至少提供 intensity / blocks / completed 之一",
  });

export const mealPatchSchema = z
  .object({
    date: dateKeySchema,
    slot: z.enum(["breakfast", "lunch", "dinner", "snack"]),
    action: z.enum(["swap", "scale"]),
    scale: z.coerce.number().min(0.5).max(2).optional(),
  })
  .refine((v) => v.action !== "scale" || typeof v.scale === "number", { message: "scale 需要提供数值" });

export const registerSchema = z.object({
  name: z.string().min(1, "请填写昵称").max(20),
  email: z.string().email("邮箱格式不正确"),
  password: z.string().min(8, "密码至少 8 位").max(72),
  inviteCode: z.string().max(64).optional(),
});

export const generateSchema = z.object({
  scope: z.enum(["all", "day", "slot"]),
  date: dateKeySchema.optional(),
  slot: z.enum(["breakfast", "lunch", "dinner", "snack"]).optional(),
});

export const mealSlotEnum = z.enum(["breakfast", "lunch", "dinner", "snack"]);
export const intensityEnumExport = intensityEnum;

// ---------------- 自定义周模板 ----------------

/** 一周中某一天:休息 / 使用内置模板 / 完全自定义动作清单 */
export const weekDaySchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("rest") }),
  z.object({ type: z.literal("template"), templateId: z.enum(TEMPLATE_IDS) }),
  z.object({
    type: z.literal("custom"),
    focus: z.string().min(1, "请填写当日主题").max(20),
    blocks: planBlocksSchema,
  }),
]);

/** 保存周模板:固定 7 天(周一..周日),同一周至少保留 1 个训练日 */
export const customWeekBaseSchema = z.object({
  week: z.array(weekDaySchema).length(7, "周模板必须包含 7 天"),
  enabled: z.boolean(),
});

const atLeastOneTraining = (v: { week: z.infer<typeof weekDaySchema>[] }) => v.week.some((d) => d.type !== "rest");

export const customWeekSchema = customWeekBaseSchema.refine(atLeastOneTraining, {
  message: "一周内至少要有一个训练日",
});

/** PUT /api/plan/week 的请求体(带可选的立即重生成) */
export const saveWeekSchema = customWeekBaseSchema
  .extend({ regenerate: z.boolean().default(false) })
  .refine(atLeastOneTraining, { message: "一周内至少要有一个训练日" });

export type CustomWeekForm = z.infer<typeof customWeekSchema>;
export type WeekDayForm = z.infer<typeof weekDaySchema>;
