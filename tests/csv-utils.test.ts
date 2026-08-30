import { describe, expect, it } from "vitest";
import { csvEscape, toCsv } from "@/lib/csv";
import { buildShoppingList } from "@/lib/meal-engine";
import { isTrustedUrl, CURATED_SOURCES } from "@/lib/search";
import { dateKey, addDays, parseDateKey, hashSeed } from "@/lib/utils";
import { placeholderSvg } from "@/lib/images";
import type { MealDayData } from "@/types";

describe("CSV", () => {
  it("包含逗号/引号/换行的字段被正确转义", () => {
    const csv = toCsv(["名", "值"], [["鸡胸,牛肉", '含"引号"'], ["多\n行", "普通"]]);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain('"鸡胸,牛肉"');
    expect(csv).toContain('"含""引号"""');
    expect(csv).toContain('"多\n行"');
  });
});

describe("购物清单", () => {
  it("同名食材合并、类别有序", () => {
    const fakeDay = (grams: number): { data: MealDayData } => ({
      data: {
        breakfast: {
          recipeId: "a", name: "A", emoji: "🙂", scale: 1, kcal: 100, protein: 10, carbs: 10, fat: 3,
          minutes: 5, difficulty: 1, costYuan: 3, tags: [],
          ingredients: [{ name: "鸡蛋", grams, cat: "蛋白质" }],
          steps: [], substitutes: [],
        },
        lunch: {
          recipeId: "b", name: "B", emoji: "🙂", scale: 1, kcal: 200, protein: 20, carbs: 20, fat: 5,
          minutes: 15, difficulty: 1, costYuan: 8, tags: [],
          ingredients: [{ name: "鸡蛋", grams: 100, cat: "蛋白质" }, { name: "西兰花", grams: 150, cat: "蔬果" }],
          steps: [], substitutes: [],
        },
        dinner: {
          recipeId: "c", name: "C", emoji: "🙂", scale: 1, kcal: 150, protein: 15, carbs: 15, fat: 4,
          minutes: 15, difficulty: 1, costYuan: 6, tags: [],
          ingredients: [{ name: "橄榄油", grams: 5, cat: "调味" }],
          steps: [], substitutes: [],
        },
        snack: {
          recipeId: "d", name: "D", emoji: "🙂", scale: 1, kcal: 80, protein: 5, carbs: 8, fat: 2,
          minutes: 2, difficulty: 1, costYuan: 2, tags: [],
          ingredients: [], steps: [], substitutes: [],
        },
      },
    });
    const list = buildShoppingList([fakeDay(50), fakeDay(30)]);
    const eggs = list.find((i) => i.name === "鸡蛋")!;
    expect(eggs.grams).toBe(50 + 100 + 30 + 100); // 两天的早餐+午餐合并
    expect(list.findIndex((i) => i.name === "鸡蛋")).toBeLessThan(list.findIndex((i) => i.name === "橄榄油"));
  });
});

describe("来源与占位图", () => {
  it("内置知识库全部通过白名单校验", () => {
    for (const s of CURATED_SOURCES) expect(isTrustedUrl(s.url)).toBe(true);
  });

  it("占位图 SVG 包含 emoji 与标签", () => {
    const svg = placeholderSvg({ seed: "abc", emoji: "🥗", label: "鸡胸沙拉" });
    expect(svg).toContain("<svg");
    expect(svg).toContain("🥗");
    expect(svg).toContain("鸡胸沙拉");
  });
});

describe("日期与工具", () => {
  it("addDays 跨月正确", () => {
    const d = parseDateKey("2026-08-31");
    expect(dateKey(addDays(d, 1))).toBe("2026-09-01");
  });

  it("hashSeed 稳定且非负", () => {
    expect(hashSeed("fitplate")).toBe(hashSeed("fitplate"));
    expect(hashSeed("fitplate")).toBeGreaterThanOrEqual(0);
  });
});
