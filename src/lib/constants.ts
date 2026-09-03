// 全局常量与免责声明文案

export const DISCLAIMER_SHORT = "热量与运动建议仅供参考,不构成医疗或营养治疗建议。";

export const DISCLAIMER_FULL =
  "FitPlate 生成的一切热量目标、宏量营养素分配、训练计划与食谱均为基于公开健康指南的参考估算,不构成医疗诊断、治疗或营养处方。" +
  "如有慢性疾病、孕期/哺乳期、未成年或饮食障碍史,请先咨询医生或注册营养师;训练中出现疼痛或不适请立即停止。";

export const AI_DISCLAIMER = "由 AI 生成,仅供启发,请结合自身情况判断。";

export const EXPORT_FOOTER = `FitPlate · ${DISCLAIMER_SHORT}`;

/** 特殊状况提示(用于问卷与档案页) */
export const FLAG_OPTIONS: { value: string; label: string; hint: string }[] = [
  { value: "pregnancy", label: "孕期/哺乳期", hint: "不建议减脂,应用会按维持热量处理并提示咨询专业人士" },
  { value: "chronic", label: "有慢性疾病/特殊健康状况", hint: "如高血压、糖尿病、甲状腺问题等,开始计划前请咨询医生" },
  { value: "ed_history", label: "有饮食障碍史", hint: "请优先在专业人士陪伴下制定饮食计划" },
];

export const DIET_PREF_OPTIONS = ["高蛋白", "素食", "快手菜", "低碳水", "爱吃辣", "少油清淡"];

export const ALLERGY_OPTIONS = ["花生", "坚果", "牛奶", "鸡蛋", "大豆", "海鲜", "麸质"];

export const EQUIPMENT_OPTIONS: { value: string; label: string; places: string[] }[] = [
  { value: "mat", label: "瑜伽垫", places: ["home", "gym"] },
  { value: "dumbbell", label: "哑铃", places: ["home", "gym"] },
  { value: "band", label: "弹力带", places: ["home", "gym"] },
  { value: "kettlebell", label: "壶铃", places: ["home", "gym"] },
  { value: "chair", label: "椅子/长凳", places: ["home", "gym"] },
  { value: "bench", label: "训练凳", places: ["home", "gym"] },
  { value: "pullup_bar", label: "引体杆", places: ["home", "gym"] },
  { value: "barbell", label: "杠铃", places: ["gym"] },
  { value: "machine", label: "固定器械", places: ["gym"] },
  { value: "cable", label: "绳索", places: ["gym"] },
  { value: "cardio_machine", label: "有氧器械", places: ["gym"] },
];

export const DEFAULT_HOME_EQUIPMENT = ["mat", "dumbbell", "band", "chair"];
export const DEFAULT_GYM_EQUIPMENT = ["mat", "dumbbell", "band", "bench", "barbell", "machine", "cable", "cardio_machine"];

/** 目标类型选项(问卷第 1 步) */
export const GOAL_OPTIONS: { value: "cut" | "bulk" | "maintain"; label: string; emoji: string; hint: string }[] = [
  { value: "cut", label: "减脂", emoji: "🔻", hint: "热量缺口,优先保肌肉、控体脂" },
  { value: "bulk", label: "增肌", emoji: "🔺", hint: "小幅盈余,肌肥大训练为主,有氧减半" },
  { value: "maintain", label: "维持体重", emoji: "⚖️", hint: "按维持热量,重点在力量与心肺进步" },
];

/** 内置周模板 id 列表(与 workout-engine.TEMPLATES 一致;放这里供 zod schema 与前端复用,避免循环依赖) */
export const TEMPLATE_IDS = ["fb_a", "fb_b", "upper", "lower", "push", "pull", "legs", "core_cardio"] as const;
export type TemplateIdValue = (typeof TEMPLATE_IDS)[number];

export const TEMPLATE_LABEL: Record<string, string> = {
  fb_a: "全身力量 A(下肢+推)",
  fb_b: "全身力量 B(髋铰链+拉)",
  upper: "上肢力量(推+拉)",
  lower: "下肢力量(腿臀)",
  push: "推日(胸肩三头)",
  pull: "拉日(背二头)",
  legs: "腿日(力量+有氧)",
  core_cardio: "核心 + 有氧",
};

export const WEEKDAY_LABELS = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
