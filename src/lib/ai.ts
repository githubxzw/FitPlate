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
  focus: string;
  targetKcal: number;
  protein: number;
}): Promise<string[]> {
  const raw = await aiJson(
    "你是一名认证健身教练。用简体中文输出 2-3 条简短、安全、可执行的建议,面向普通减脂人群。禁止医疗诊断与药物建议。输出 JSON: {\"tips\": string[]}",
    JSON.stringify(input),
    TipsSchema
  );
  if (raw) return raw.tips;
  return ruleTips(input.focus);
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

export function ruleTips(focus: string): string[] {
  const idx = Math.abs(focus.length * 7) % RULE_TIP_POOL.length;
  return [RULE_TIP_POOL[idx], RULE_TIP_POOL[(idx + 3) % RULE_TIP_POOL.length]];
}
