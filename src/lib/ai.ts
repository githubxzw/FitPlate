// AI 服务(可选增强):
// - 通过服务端调用模型,要求其输出 JSON 并用 zod 校验字段;
// - 未配置 AI_API_KEY 或调用/校验失败时,一律回退到内置规则引擎,不影响主流程。
// API Key 只在服务端读取,绝不暴露到客户端。

import { z } from "zod";

export const aiConfig = {
  apiKey: process.env.AI_API_KEY || "",
  baseUrl: (process.env.AI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, ""),
  model: process.env.AI_MODEL || "gpt-4o-mini",
};

export function aiEnabled(): boolean {
  return Boolean(aiConfig.apiKey);
}

/** 调用 chat/completions 并校验 JSON 输出;任何失败返回 null(调用方回退) */
export async function aiJson<T>(system: string, user: string, schema: z.ZodType<T>, timeoutMs = 20000): Promise<T | null> {
  if (!aiEnabled()) return null;
  try {
    const res = await fetch(`${aiConfig.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${aiConfig.apiKey}`,
      },
      body: JSON.stringify({
        model: aiConfig.model,
        temperature: 0.7,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) throw new Error(`ai ${res.status}`);
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const content = json.choices?.[0]?.message?.content;
    if (!content) return null;
    const parsed = schema.safeParse(JSON.parse(content));
    return parsed.success ? parsed.data : null;
  } catch (e) {
    console.warn("[ai] request/validate failed, using rule engine fallback:", e);
    return null;
  }
}

// ---- 教练小贴士(用于训练日) ----

const TipsSchema = z.object({
  tips: z.array(z.string().min(4).max(120)).min(1).max(3),
});

export async function coachTips(input: {
  sex: string;
  age: number;
  experience: string;
  goal: string;
  /** 结构化目标模式,用于挑选提示池与模型受众描述 */
  audienceGoal?: "cut" | "bulk" | "maintain";
  focus: string;
  targetKcal: number;
  protein: number;
}): Promise<string[]> {
  const audience =
    input.audienceGoal === "bulk"
      ? "以增肌为目标的训练者(干净增重,重视渐进超负荷与碳水/蛋白质摄入)"
      : input.audienceGoal === "maintain"
        ? "以维持体重与体能进步为目标的训练者"
        : "普通减脂人群";
  const raw = await aiJson(
    `你是一名认证健身教练。用简体中文输出 2-3 条简短、安全、可执行的建议,面向${audience}。禁止医疗诊断与药物建议。输出 JSON: {"tips": string[]}`,
    JSON.stringify(input),
    TipsSchema
  );
  if (raw) return raw.tips;
  return ruleTips(input.focus, input.audienceGoal);
}

const RULE_TIP_POOL = [
  "训练前 1-2 小时吃点易消化的碳水,训练表现会更好。",
  "每组动作追求“最后 2 次略吃力”的强度,但始终保持动作质量优先。",
  "组间休息不要刷手机太久,60-90 秒是增肌减脂的甜点区。",
  "减脂期蛋白质要吃够,每一餐都要有蛋白质来源。",
  "每天喝够 1.5-2 升水,训练日再多一些。",
  "睡够 7-8 小时,睡眠不足会让减脂事倍功半。",
  "有氧不是越多越好,与力量训练搭配才能保住肌肉。",
  "体重会有波动,关注每周平均值的变化更靠谱。",
  "记录完成度比记录完美更重要,坚持打卡。",
  "拉伸不是可有可无的,它决定你明天的训练状态。",
];

/** 增肌专属提示 */
const BULK_TIP_POOL = [
  "增肌的核心是渐进超负荷:每周尝试比上周多 1 次或加一点重量。",
  "主力量动作保持 6-12 次、组间休息 90-120 秒,给肌肉恢复时间。",
  "训练后 1 小时内吃到碳水+蛋白质,抓住合成窗口。",
  "干净增重:每周体重上升 0.25~0.5 kg 最理想,涨太快就减一点份量。",
  "睡眠是天然的合成代谢剂,争取 7-9 小时。",
  "有氧减量但不取消,20 分钟以内能维护心肺又不影响恢复。",
  "每个部位每周练到 2 次,比一次练爆更利于增长。",
];

export function ruleTips(focus: string, goal?: string): string[] {
  if (goal === "bulk") {
    const idx = Math.abs(focus.length * 7) % BULK_TIP_POOL.length;
    return [BULK_TIP_POOL[idx], BULK_TIP_POOL[(idx + 3) % BULK_TIP_POOL.length]];
  }
  const idx = Math.abs(focus.length * 7) % RULE_TIP_POOL.length;
  return [RULE_TIP_POOL[idx], RULE_TIP_POOL[(idx + 3) % RULE_TIP_POOL.length]];
}
