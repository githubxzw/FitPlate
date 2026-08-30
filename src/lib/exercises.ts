// 训练动作库(纯数据,无运行时依赖)
// level: 1 初学者 / 2 进阶 / 3 高阶
// equipment: none=徒手, mat=瑜伽垫, chair=椅子, dumbbell/band/kettlebell/bench/pullup_bar=居家常用,
//            barbell/machine/cable/cardio_machine=健身房

import type { BlockItem } from "@/types";

export type ExType = "warmup" | "strength" | "cardio" | "stretch";

export interface Exercise {
  id: string;
  name: string;
  emoji: string;
  type: ExType;
  equipment: string[]; // 任一满足即可
  level: 1 | 2 | 3;
  muscle: string;
  unit: "reps" | "seconds" | "minutes";
  sets: number;
  reps: number; // unit=reps 时为次数;unit=seconds 时为秒;unit=minutes 时为分钟
  restSec: number;
  tips: string[];
}

export const EXERCISES: Exercise[] = [
  // ---- 热身 ----
  { id: "w-jumping-jack", name: "开合跳", emoji: "🤸", type: "warmup", equipment: ["none"], level: 1, muscle: "全身", unit: "seconds", sets: 2, reps: 40, restSec: 20, tips: ["落地屈膝缓冲", "节奏均匀,逐步提速"] },
  { id: "w-high-knees", name: "原地高抬腿", emoji: "🏃", type: "warmup", equipment: ["none"], level: 1, muscle: "下肢", unit: "seconds", sets: 2, reps: 30, restSec: 20, tips: ["核心收紧", "膝盖抬至髋部高度"] },
  { id: "w-arm-circle", name: "肩部环绕", emoji: "🌀", type: "warmup", equipment: ["none"], level: 1, muscle: "肩带", unit: "seconds", sets: 2, reps: 25, restSec: 15, tips: ["前后各绕半程", "动作缓慢有控制"] },
  { id: "w-hip-circle", name: "髋部环绕", emoji: "🔄", type: "warmup", equipment: ["none"], level: 1, muscle: "髋部", unit: "seconds", sets: 2, reps: 25, restSec: 15, tips: ["双手叉腰画大圆", "唤醒髋关节"] },
  { id: "w-cat-cow", name: "猫牛式", emoji: "🐈", type: "warmup", equipment: ["mat"], level: 1, muscle: "脊柱", unit: "seconds", sets: 2, reps: 30, restSec: 10, tips: ["呼气弓背、吸气塌腰", "跟随呼吸节奏"] },
  { id: "w-leg-swing", name: "腿部摆动", emoji: "🦵", type: "warmup", equipment: ["none"], level: 1, muscle: "下肢", unit: "seconds", sets: 2, reps: 30, restSec: 15, tips: ["扶墙保持平衡", "前后左右各摆"] },

  // ---- 力量:推(胸肩三头) ----
  { id: "s-pushup", name: "俯卧撑", emoji: "💪", type: "strength", equipment: ["none"], level: 1, muscle: "胸/肩/三头", unit: "reps", sets: 3, reps: 10, restSec: 75, tips: ["身体一条直线", "手肘约45°,不要外展过度", "做不动可跪姿"] },
  { id: "s-incline-pushup", name: "上斜俯卧撑", emoji: "🪑", type: "strength", equipment: ["chair", "bench"], level: 1, muscle: "胸/肩/三头", unit: "reps", sets: 3, reps: 12, restSec: 60, tips: ["撑于椅子/床沿", "核心收紧不塌腰"] },
  { id: "s-db-floor-press", name: "哑铃地板卧推", emoji: "🏋️", type: "strength", equipment: ["dumbbell", "bench"], level: 2, muscle: "胸/三头", unit: "reps", sets: 3, reps: 10, restSec: 90, tips: ["下放至大臂轻触地面", "呼气推起"] },
  { id: "s-bb-bench-press", name: "杠铃卧推", emoji: "🏋️", type: "strength", equipment: ["barbell"], level: 3, muscle: "胸/三头", unit: "reps", sets: 4, reps: 8, restSec: 120, tips: ["肩胛后收下沉", "全程有人保护或用安全架"] },
  { id: "s-db-shoulder-press", name: "哑铃肩推", emoji: "🤗", type: "strength", equipment: ["dumbbell"], level: 2, muscle: "肩", unit: "reps", sets: 3, reps: 10, restSec: 90, tips: ["肋骨内收不要挺腰", "推至手臂接近伸直"] },
  { id: "s-pike-pushup", name: "折刀俯卧撑", emoji: "🔺", type: "strength", equipment: ["none", "mat"], level: 2, muscle: "肩/三头", unit: "reps", sets: 3, reps: 8, restSec: 75, tips: ["臀部抬高呈倒V", "头顶朝向地面下落"] },
  { id: "s-machine-press", name: "坐姿推胸机", emoji: "🛠️", type: "strength", equipment: ["machine"], level: 1, muscle: "胸/三头", unit: "reps", sets: 3, reps: 12, restSec: 75, tips: ["背部贴紧靠垫", "推出不完全锁肘"] },
  { id: "s-dips-chair", name: "板凳臂屈伸", emoji: "🪑", type: "strength", equipment: ["chair", "bench"], level: 1, muscle: "三头", unit: "reps", sets: 3, reps: 10, restSec: 60, tips: ["肘部朝后,不耸肩", "肩部不适即停"] },

  // ---- 力量:拉(背二头) ----
  { id: "s-db-row", name: "单臂哑铃划船", emoji: "🚣", type: "strength", equipment: ["dumbbell"], level: 2, muscle: "背", unit: "reps", sets: 3, reps: 10, restSec: 90, tips: ["背部平直,肘贴近身体", "用背发力而非手臂"] },
  { id: "s-band-row", name: "弹力带划船", emoji: "➰", type: "strength", equipment: ["band"], level: 1, muscle: "背", unit: "reps", sets: 3, reps: 12, restSec: 60, tips: ["肩胛先收再拉", "缓慢还原感受张力"] },
  { id: "s-water-row", name: "水瓶俯身划船", emoji: "🍶", type: "strength", equipment: ["none"], level: 1, muscle: "背", unit: "reps", sets: 3, reps: 12, restSec: 60, tips: ["双手各握满水瓶", "俯身45°保持背部平直"] },
  { id: "s-pullup", name: "引体向上", emoji: "🧗", type: "strength", equipment: ["pullup_bar"], level: 3, muscle: "背", unit: "reps", sets: 4, reps: 6, restSec: 120, tips: ["从悬挂位拉至下巴过杠", "可用弹力带辅助"] },
  { id: "s-lat-pulldown", name: "高位下拉", emoji: "🛠️", type: "strength", equipment: ["machine", "cable"], level: 1, muscle: "背", unit: "reps", sets: 3, reps: 12, restSec: 75, tips: ["挺胸,杠拉向锁骨", "不要用惯性后仰"] },
  { id: "s-seated-row", name: "坐姿划船", emoji: "🛠️", type: "strength", equipment: ["machine", "cable"], level: 1, muscle: "背", unit: "reps", sets: 3, reps: 12, restSec: 75, tips: ["胸口顶住挡板", "肘部向后收"] },
  { id: "s-db-curl", name: "哑铃弯举", emoji: "💪", type: "strength", equipment: ["dumbbell"], level: 1, muscle: "二头", unit: "reps", sets: 3, reps: 12, restSec: 60, tips: ["大臂固定,只动小臂", "顶端挤压1秒"] },

  // ---- 力量:腿臀 ----
  { id: "s-squat", name: "自重深蹲", emoji: "🦵", type: "strength", equipment: ["none"], level: 1, muscle: "腿臀", unit: "reps", sets: 3, reps: 15, restSec: 75, tips: ["膝盖与脚尖同向", "蹲到大腿接近平行地面"] },
  { id: "s-db-goblet-squat", name: "哑铃杯式深蹲", emoji: "🏋️", type: "strength", equipment: ["dumbbell", "kettlebell"], level: 2, muscle: "腿臀", unit: "reps", sets: 3, reps: 12, restSec: 90, tips: ["重物贴胸", "全程核心收紧"] },
  { id: "s-lunge", name: "弓步蹲", emoji: "🚶", type: "strength", equipment: ["none"], level: 1, muscle: "腿臀", unit: "reps", sets: 3, reps: 10, restSec: 75, tips: ["每侧10次", "前膝不超过脚尖太多"] },
  { id: "s-glute-bridge", name: "臀桥", emoji: "🍑", type: "strength", equipment: ["mat", "none"], level: 1, muscle: "臀", unit: "reps", sets: 3, reps: 15, restSec: 60, tips: ["顶端夹臀1秒", "避免腰部代偿"] },
  { id: "s-wall-sit", name: "靠墙静蹲", emoji: "🧱", type: "strength", equipment: ["none"], level: 1, muscle: "腿", unit: "seconds", sets: 3, reps: 40, restSec: 60, tips: ["大腿平行地面", "保持呼吸不憋气"] },
  { id: "s-calf-raise", name: "提踵", emoji: "🦶", type: "strength", equipment: ["none"], level: 1, muscle: "小腿", unit: "reps", sets: 3, reps: 15, restSec: 45, tips: ["顶端停顿1秒", "扶墙保持稳定"] },
  { id: "s-bulgarian", name: "保加利亚分腿蹲", emoji: "🦵", type: "strength", equipment: ["chair", "bench"], level: 3, muscle: "腿臀", unit: "reps", sets: 3, reps: 8, restSec: 90, tips: ["后脚搭在椅子上", "重心放前腿"] },
  { id: "s-leg-press", name: "腿举机", emoji: "🛠️", type: "strength", equipment: ["machine"], level: 1, muscle: "腿", unit: "reps", sets: 3, reps: 12, restSec: 90, tips: ["腰部贴紧靠背", "膝盖不完全锁死"] },
  { id: "s-rdl", name: "哑铃直腿硬拉", emoji: "🏋️", type: "strength", equipment: ["dumbbell", "barbell"], level: 2, muscle: "腘绳肌/臀", unit: "reps", sets: 3, reps: 10, restSec: 90, tips: ["髋部向后推", "背部平直,感受大腿后侧拉伸"] },

  // ---- 力量:核心 ----
  { id: "s-plank", name: "平板支撑", emoji: "🧘", type: "strength", equipment: ["mat", "none"], level: 1, muscle: "核心", unit: "seconds", sets: 3, reps: 40, restSec: 60, tips: ["肘在肩正下方", "不塌腰不撅臀"] },
  { id: "s-side-plank", name: "侧平板支撑", emoji: "📐", type: "strength", equipment: ["mat", "none"], level: 2, muscle: "侧腹", unit: "seconds", sets: 3, reps: 30, restSec: 45, tips: ["每侧30秒", "髋部向上顶"] },
  { id: "s-dead-bug", name: "死虫式", emoji: "🐛", type: "strength", equipment: ["mat", "none"], level: 1, muscle: "核心", unit: "reps", sets: 3, reps: 10, restSec: 45, tips: ["腰部始终贴地", "对侧手脚同时伸展"] },
  { id: "s-crunch", name: "卷腹", emoji: "🌀", type: "strength", equipment: ["mat", "none"], level: 1, muscle: "腹直肌", unit: "reps", sets: 3, reps: 15, restSec: 45, tips: ["呼气卷起,下背贴地", "不要用手拉头"] },
  { id: "s-mountain", name: "登山跑", emoji: "⛰️", type: "strength", equipment: ["mat", "none"], level: 1, muscle: "核心/心肺", unit: "seconds", sets: 3, reps: 30, restSec: 45, tips: ["肩在腕正上方", "膝盖快速交替向胸"] },
  { id: "s-superman", name: "小燕飞", emoji: "🦸", type: "strength", equipment: ["mat", "none"], level: 1, muscle: "下背", unit: "reps", sets: 3, reps: 12, restSec: 45, tips: ["四肢同时轻轻抬离地面", "颈部长而放松"] },

  // ---- 有氧 ----
  { id: "c-brisk-walk", name: "快走", emoji: "🚶", type: "cardio", equipment: ["none"], level: 1, muscle: "心肺", unit: "minutes", sets: 1, reps: 30, restSec: 0, tips: ["保持微微气喘但可交谈", "摆臂+步频加快"] },
  { id: "c-jog", name: "慢跑", emoji: "🏃", type: "cardio", equipment: ["none"], level: 2, muscle: "心肺", unit: "minutes", sets: 1, reps: 25, restSec: 0, tips: ["心率控制在最大心率60-70%", "前脚掌或全脚掌落地"] },
  { id: "c-jump-rope", name: "跳绳", emoji: "🪢", type: "cardio", equipment: ["none"], level: 2, muscle: "心肺", unit: "minutes", sets: 1, reps: 15, restSec: 0, tips: ["可采用跳1分钟休30秒循环", "落地轻柔"] },
  { id: "c-hiit", name: "HIIT 间歇(开合跳+波比跳)", emoji: "🔥", type: "cardio", equipment: ["none"], level: 3, muscle: "心肺", unit: "minutes", sets: 1, reps: 16, restSec: 0, tips: ["运动40秒/休息20秒循环", "共约16分钟,量力而行"] },
  { id: "c-elliptical", name: "椭圆机", emoji: "🛠️", type: "cardio", equipment: ["cardio_machine"], level: 1, muscle: "心肺", unit: "minutes", sets: 1, reps: 30, restSec: 0, tips: ["阻力适中", "全脚掌踩踏"] },
  { id: "c-bike", name: "动感单车/骑行", emoji: "🚴", type: "cardio", equipment: ["cardio_machine", "none"], level: 1, muscle: "心肺", unit: "minutes", sets: 1, reps: 30, restSec: 0, tips: ["座椅高度与髋平齐", "保持踏频80-90rpm"] },
  { id: "c-stairs", name: "爬楼梯", emoji: "🪜", type: "cardio", equipment: ["none"], level: 1, muscle: "心肺/下肢", unit: "minutes", sets: 1, reps: 20, restSec: 0, tips: ["下楼坐电梯保护膝盖", "保持稳定节奏"] },

  // ---- 拉伸放松 ----
  { id: "x-hamstring", name: "站立体前屈", emoji: "🧘", type: "stretch", equipment: ["none"], level: 1, muscle: "大腿后侧", unit: "seconds", sets: 1, reps: 40, restSec: 0, tips: ["膝盖可微屈", "缓慢深呼吸"] },
  { id: "x-quad", name: "大腿前侧拉伸", emoji: "🦵", type: "stretch", equipment: ["none"], level: 1, muscle: "大腿前侧", unit: "seconds", sets: 1, reps: 40, restSec: 0, tips: ["扶墙保持平衡", "每侧20秒"] },
  { id: "x-hip-flexor", name: "髂腰肌拉伸", emoji: "🏹", type: "stretch", equipment: ["mat", "none"], level: 1, muscle: "髋前侧", unit: "seconds", sets: 1, reps: 40, restSec: 0, tips: ["弓步跪姿,骨盆后倾", "每侧20秒"] },
  { id: "x-child-pose", name: "婴儿式", emoji: "👶", type: "stretch", equipment: ["mat", "none"], level: 1, muscle: "背/肩", unit: "seconds", sets: 1, reps: 45, restSec: 0, tips: ["臀部坐向脚跟", "深长呼吸放松"] },
  { id: "x-shoulder", name: "肩背拉伸", emoji: "🤲", type: "stretch", equipment: ["none"], level: 1, muscle: "肩背", unit: "seconds", sets: 1, reps: 40, restSec: 0, tips: ["手臂横过胸前", "每侧20秒"] },
  { id: "x-cat-cow-x", name: "猫牛式放松", emoji: "🐈", type: "stretch", equipment: ["mat", "none"], level: 1, muscle: "脊柱", unit: "seconds", sets: 1, reps: 40, restSec: 0, tips: ["缓慢跟随呼吸", "放松整条脊柱"] },
];

export const EXERCISE_MAP: Record<string, Exercise> = Object.fromEntries(EXERCISES.map((e) => [e.id, e]));

/** 按动作 ID 生成 BlockItem(供引擎使用) */
export function toItem(e: Exercise): BlockItem {
  return {
    exerciseId: e.id,
    name: e.name,
    emoji: e.emoji,
    kind: e.type,
    sets: e.sets,
    repsOrDuration: e.reps,
    unit: e.unit,
    restSec: e.restSec,
    tips: e.tips,
  };
}

/** 替换候选:同类型、同主要肌群、可用器械、等级不超过用户水平 */
export function replacementCandidates(
  exerciseId: string,
  opts: { equipment: string[]; level: 1 | 2 | 3 }
): Exercise[] {
  const src = EXERCISE_MAP[exerciseId];
  if (!src) return [];
  return EXERCISES.filter(
    (e) =>
      e.id !== src.id &&
      e.type === src.type &&
      e.muscle === src.muscle &&
      e.level <= opts.level &&
      e.equipment.some((eq) => eq === "none" || opts.equipment.includes(eq))
  );
}
