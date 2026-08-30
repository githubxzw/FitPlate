import { db } from "@/lib/db";
import { fail, handle, ApiError, requireUserId } from "@/lib/api";
import { toCsv } from "@/lib/csv";
import { buildShoppingList } from "@/lib/meal-engine";
import { EXPORT_FOOTER } from "@/lib/constants";
import type { MealDayData, PlanBlocks } from "@/types";
import { dateKey, parseDateKey, shortDate, weekdayLabel, MEAL_SLOT_LABEL, fromJson } from "@/lib/utils";

/** GET /api/export/csv?type=workouts|meals|shopping&from&to → CSV 附件(带 BOM) */
export const GET = handle(async (req: Request) => {
  const userId = await requireUserId();
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") ?? "workouts";
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const range = from && to ? { gte: parseDateKey(from), lte: parseDateKey(to) } : undefined;

  let csv: string;
  let filename: string;

  if (type === "workouts") {
    const days = await db.planDay.findMany({ where: range ? { userId, date: range } : { userId }, orderBy: { date: "asc" } });
    const rows: unknown[][] = [];
    for (const d of days) {
      const blocks = fromJson<PlanBlocks>(d.blocks);
      const items = [...blocks.warmup, ...blocks.strength, ...blocks.cardio, ...blocks.stretch];
      if (items.length === 0) {
        rows.push([dateKey(d.date), weekdayLabel(dateKey(d.date)), d.isTraining ? "训练日" : "休息日", d.focus, "", "", "", "", "", d.completed ? "已打卡" : ""]);
        continue;
      }
      for (const it of items) {
        rows.push([
          dateKey(d.date),
          weekdayLabel(dateKey(d.date)),
          d.isTraining ? "训练日" : "休息日",
          d.focus,
          { warmup: "热身", strength: "力量", cardio: "有氧", stretch: "拉伸" }[it.kind],
          it.name,
          it.sets ?? "",
          it.unit === "reps" ? `${it.repsOrDuration ?? ""}次` : it.unit === "seconds" ? `${it.repsOrDuration ?? ""}秒` : `${it.repsOrDuration ?? ""}分钟`,
          it.restSec ?? "",
          it.tips.join(" / "),
          d.completed ? "已打卡" : "",
        ]);
      }
    }
    rows.push([]);
    rows.push([EXPORT_FOOTER]);
    csv = toCsv(["日期", "星期", "类型", "训练重点", "环节", "动作", "组数", "次数/时长", "组间休息(秒)", "要点", "打卡"], rows);
    filename = "fitplate-训练计划.csv";
  } else if (type === "meals") {
    const days = await db.mealDay.findMany({ where: range ? { userId, date: range } : { userId }, orderBy: { date: "asc" } });
    const rows: unknown[][] = [];
    for (const d of days) {
      const slots = fromJson<MealDayData>(d.slots);
      for (const slotName of ["breakfast", "lunch", "dinner", "snack"] as const) {
        const s = slots[slotName];
        if (!s) continue;
        rows.push([
          dateKey(d.date),
          weekdayLabel(dateKey(d.date)),
          MEAL_SLOT_LABEL[slotName],
          s.name,
          s.kcal,
          s.protein,
          s.carbs,
          s.fat,
          s.minutes,
          s.scale,
          s.ingredients.map((i) => `${i.name}${i.grams}克`).join(" / "),
          s.steps.join(" → "),
          d.completedSlots.includes(slotName) ? "已打卡" : "",
        ]);
      }
    }
    rows.push([]);
    rows.push([EXPORT_FOOTER]);
    csv = toCsv(["日期", "星期", "餐次", "菜名", "热量(kcal)", "蛋白质(g)", "碳水(g)", "脂肪(g)", "烹饪时长(分)", "份量比例", "食材(克)", "步骤", "打卡"], rows);
    filename = "fitplate-饮食规划.csv";
  } else if (type === "shopping") {
    const rows = await db.mealDay.findMany({ where: range ? { userId, date: range } : { userId }, orderBy: { date: "asc" } });
    const items = buildShoppingList(rows.map((r) => ({ data: fromJson<MealDayData>(r.slots) })));
    const data: unknown[][] = items.map((i) => [i.cat, i.name, `${i.grams}克`, i.usedIn.join("、")]);
    data.push([]);
    if (from && to) data.push([`覆盖范围:${shortDate(from)} - ${shortDate(to)}`]);
    data.push([EXPORT_FOOTER]);
    csv = toCsv(["类别", "食材", "总用量", "用于"], data);
    filename = "fitplate-购物清单.csv";
  } else {
    throw new ApiError(422, "type 必须是 workouts / meals / shopping");
  }

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
    },
  });
});
