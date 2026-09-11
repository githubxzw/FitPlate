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
  { id: "s-cable-fly", name: "绳索夹胸", emoji: "🛠️", type: "strength", equipment: ["cable"], level: 2, muscle: "胸", unit: "reps", sets: 3, reps: 12, restSec: 75, tips: ["手臂微屈固定角度", "胸前合拢挤压1秒"] },
  { id: "s-db-lateral-raise", name: "哑铃侧平举", emoji: "🤸", type: "strength", equipment: ["dumbbell"], level: 1, muscle: "肩", unit: "reps", sets: 3, reps: 12, restSec: 60, tips: ["重量宁小勿大", "抬至肩平即止,不耸肩"] },
  { id: "s-db-shoulder-press", name: "哑铃肩推", emoji: "🤗", type: "strength", equipment: ["dumbbell"], level: 2, muscle: "肩", unit: "reps", sets: 3, reps: 10, restSec: 90, tips: ["肋骨内收不要挺腰", "推至手臂接近伸直"] },
  { id: "s-pike-pushup", name: "折刀俯卧撑", emoji: "🔺", type: "strength", equipment: ["none", "mat"], level: 2, muscle: "肩/三头", unit: "reps", sets: 3, reps: 8, restSec: 75, tips: ["臀部抬高呈倒V", "头顶朝向地面下落"] },
  { id: "s-machine-press", name: "坐姿推胸机", emoji: "🛠️", type: "strength", equipment: ["machine"], level: 1, muscle: "胸/三头", unit: "reps", sets: 3, reps: 12, restSec: 75, tips: ["背部贴紧靠垫", "推出不完全锁肘"] },
  { id: "s-dips-chair", name: "板凳臂屈伸", emoji: "🪑", type: "strength", equipment: ["chair", "bench"], level: 1, muscle: "三头", unit: "reps", sets: 3, reps: 10, restSec: 60, tips: ["肘部朝后,不耸肩", "肩部不适即停"] },

  // ---- 力量:拉(背二头) ----
  { id: "s-db-row", name: "单臂哑铃划船", emoji: "🚣", type: "strength", equipment: ["dumbbell"], level: 2, muscle: "背", unit: "reps", sets: 3, reps: 10, restSec: 90, tips: ["背部平直,肘贴近身体", "用背发力而非手臂"] },
  { id: "s-bb-row", name: "杠铃俯身划船", emoji: "🏋️", type: "strength", equipment: ["barbell"], level: 3, muscle: "背", unit: "reps", sets: 4, reps: 8, restSec: 120, tips: ["俯身约45°背部平直", "拉向下胸,肘贴身后拉"] },
  { id: "s-band-row", name: "弹力带划船", emoji: "➰", type: "strength", equipment: ["band"], level: 1, muscle: "背", unit: "reps", sets: 3, reps: 12, restSec: 60, tips: ["肩胛先收再拉", "缓慢还原感受张力"] },
  { id: "s-water-row", name: "水瓶俯身划船", emoji: "🍶", type: "strength", equipment: ["none"], level: 1, muscle: "背", unit: "reps", sets: 3, reps: 12, restSec: 60, tips: ["双手各握满水瓶", "俯身45°保持背部平直"] },
  { id: "s-pullup", name: "引体向上", emoji: "🧗", type: "strength", equipment: ["pullup_bar"], level: 3, muscle: "背", unit: "reps", sets: 4, reps: 6, restSec: 120, tips: ["从悬挂位拉至下巴过杠", "可用弹力带辅助"] },
  { id: "s-lat-pulldown", name: "高位下拉", emoji: "🛠️", type: "strength", equipment: ["machine", "cable"], level: 1, muscle: "背", unit: "reps", sets: 3, reps: 12, restSec: 75, tips: ["挺胸,杠拉向锁骨", "不要用惯性后仰"] },
  { id: "s-seated-row", name: "坐姿划船", emoji: "🛠️", type: "strength", equipment: ["machine", "cable"], level: 1, muscle: "背", unit: "reps", sets: 3, reps: 12, restSec: 75, tips: ["胸口顶住挡板", "肘部向后收"] },
  { id: "s-db-curl", name: "哑铃弯举", emoji: "💪", type: "strength", equipment: ["dumbbell"], level: 1, muscle: "二头", unit: "reps", sets: 3, reps: 12, restSec: 60, tips: ["大臂固定,只动小臂", "顶端挤压1秒"] },
  { id: "s-hammer-curl", name: "锤式弯举", emoji: "🔨", type: "strength", equipment: ["dumbbell"], level: 1, muscle: "二头/前臂", unit: "reps", sets: 3, reps: 12, restSec: 60, tips: ["掌心相对握哑铃", "缓慢下放2秒"] },

  // ---- 力量:腿臀 ----
  { id: "s-squat", name: "自重深蹲", emoji: "🦵", type: "strength", equipment: ["none"], level: 1, muscle: "腿臀", unit: "reps", sets: 3, reps: 15, restSec: 75, tips: ["膝盖与脚尖同向", "蹲到大腿接近平行地面"] },
  { id: "s-bb-squat", name: "杠铃背蹲", emoji: "🏋️", type: "strength", equipment: ["barbell", "bench"], level: 3, muscle: "腿臀", unit: "reps", sets: 4, reps: 8, restSec: 150, tips: ["杠置于斜方肌上", "蹲至大腿平行或更低", "必要时用深蹲架安全销"] },
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

/**
 * 动作演示:内置动图 + 分步中文说明
 * 动图来源:github.com/hasaneyldrm/exercises-dataset(© Gym visual 授权分发,见 public/exercise-gifs/NOTICE.md)
 * 未配置 gif 的动作,前端会提供站外示范视频搜索入口。
 */
export const EXERCISE_DEMO: Record<string, { gif: string; steps: string[] }> = {
  "c-bike": { gif: "/exercise-gifs/c-bike.gif", steps: ["调整座椅高度和位置以确保正确对齐", "将脚放在踏板上，并用带子（如果有）将其固定", "以舒适的速度开始踩踏板", "保持稳定的节奏并根据需要增加阻力"] },
  "c-brisk-walk": { gif: "/exercise-gifs/c-brisk-walk.gif", steps: ["将跑步机的倾斜度调整到您想要的强度", "站在跑步机上，双脚分开与肩同宽", "开始以舒适的步伐行走，确保保持正确的姿势", "在整个练习过程中，调动核心肌肉并保持背部挺直"] },
  "c-elliptical": { gif: "/exercise-gifs/c-elliptical.gif", steps: ["将椭圆机的阻力水平和倾斜度调整到您想要的设置", "踩上机器的踏板并轻轻握住手柄", "首先用脚向下压，然后将手柄拉向身体", "继续这个动作，交替推和拉，以模拟行走或跑步动作"] },
  "c-hiit": { gif: "/exercise-gifs/c-hiit.gif", steps: ["从站立位置开始，双脚分开与肩同宽", "弯曲膝盖并将双手放在身前的地板上，将身体降低至蹲姿", "将脚踢回到俯卧撑位置", "进行俯卧撑，保持身体呈一条直线"] },
  "c-jump-rope": { gif: "/exercise-gifs/c-jump-rope.gif", steps: ["双手握住跳绳的手柄，掌心向内", "站立，双脚分开与肩同宽，膝盖稍微弯曲", "将绳子甩过头顶，当绳子靠近你的脚时跳过它", "轻轻地用脚掌着地，当绳子再次绕回时重复跳跃"] },
  "c-stairs": { gif: "/exercise-gifs/c-stairs.gif", steps: ["将步进机调整到舒适的水平", "走上机器，将双手放在扶手上以获得支撑", "开始行走时，将一只脚放在台阶上，然后将另一只脚放在台阶上，双腿交替", "保持直立姿势并锻炼核心肌肉"] },
  "s-band-row": { gif: "/exercise-gifs/s-band-row.gif", steps: ["将带子固定在腰部高度的稳定锚点上", "面向锚点站立，双脚分开与肩同宽", "用一只手握住弹力带，手掌朝内，然后后退以在弹力带中产生张力", "稍微弯曲膝盖，髋部向前转动，保持背部挺直"] },
  "s-bb-bench-press": { gif: "/exercise-gifs/s-bb-bench-press.gif", steps: ["平躺在长凳上，双脚平放在地上，背部紧贴长凳", "正手握住杠铃，握距略宽于肩宽", "将杠铃从架子上提起，并将其直接放在胸部上方，双臂完全伸展", "将杠铃慢慢降低到胸部，保持肘部内收"] },
  "s-bulgarian": { gif: "/exercise-gifs/s-bulgarian.gif", steps: ["双脚分开与肩同宽站立", "一只脚向前迈出一步，并将其放在另一只脚前面约两英尺处", "弯曲膝盖和臀部，降低身体，保持背部挺直", "继续降低，直到前大腿与地面平行，后膝盖悬停在地面上方"] },
  "s-calf-raise": { gif: "/exercise-gifs/s-calf-raise.gif", steps: ["双脚分开与肩同宽站立，脚趾指向前方", "将手放在墙壁或稳定的表面上以保持平衡", "慢慢地将脚后跟抬离地面，将身体重量转移到脚掌上", "在顶部停顿片刻，然后慢慢降低脚后跟回到起始位置"] },
  "s-crunch": { gif: "/exercise-gifs/s-crunch.gif", steps: ["平躺，膝盖弯曲，双脚平放在地上", "将双臂伸直至头顶上方", "收紧腹肌，将上半身抬离地面，向前向膝盖弯曲", "在顶部停顿片刻，然后慢慢将上半身放回起始位置"] },
  "s-db-curl": { gif: "/exercise-gifs/s-db-curl.gif", steps: ["站直，双手各握一个哑铃，手掌朝前，双臂完全伸展", "保持上臂静止，呼气并弯举哑铃，同时收缩二头肌", "继续举起哑铃，直到二头肌完全收缩并且哑铃与肩部齐平", "挤压二头肌时，保持收缩位置短暂停顿"] },
  "s-db-floor-press": { gif: "/exercise-gifs/s-db-floor-press.gif", steps: ["仰卧在地板上，膝盖弯曲，双脚平放在地面上", "用一只手握住杠铃，掌心朝上，将手臂伸直至胸部上方", "慢慢地将杠铃降低到胸部，保持肘部靠近身体", "在底部停顿片刻，然后将杠铃推回到起始位置"] },
  "s-db-goblet-squat": { gif: "/exercise-gifs/s-db-goblet-squat.gif", steps: ["双脚分开与肩同宽站立，双手握住哑铃垂直放在胸前", "保持胸部挺直，核心收紧，通过向后推臀部并弯曲膝盖，将身体降低至蹲姿", "继续降低，直到大腿与地面平行，或者尽可能低", "在底部停顿片刻，然后推动脚后跟回到起始位置"] },
  "s-db-row": { gif: "/exercise-gifs/s-db-row.gif", steps: ["双脚分开与肩同宽站立，一手握住哑铃，手掌朝向身体", "稍微弯曲膝盖，髋部向前转动，保持背部挺直，核心肌群参与", "让哑铃垂直垂向地板，手臂完全伸展", "将哑铃向上拉向胸部，保持肘部靠近身体并将肩胛骨挤压在一起"] },
  "s-db-shoulder-press": { gif: "/exercise-gifs/s-db-shoulder-press.gif", steps: ["双脚分开与肩同宽站立，一只手握住哑铃，与肩同高，手掌朝前", "向上推哑铃，直到手臂完全伸过头顶", "在最高点暂停片刻，然后慢慢将哑铃放回起始位置", "重复所需的重复次数，然后换到另一只手臂"] },
  "s-dead-bug": { gif: "/exercise-gifs/s-dead-bug.gif", steps: ["平躺，双臂伸向天花板", "弯曲膝盖，将双腿抬离地面，使臀部和膝盖形成 90 度角", "接合你的核心和下背部，将你的下背部压入地面", "慢慢地将右臂和左腿放低至地面，保持它们伸直并悬停在地板上方"] },
  "s-dips-chair": { gif: "/exercise-gifs/s-dips-chair.gif", steps: ["坐在长凳或椅子的边缘，双手抓住臀部旁边的边缘", "将臀部从长凳上滑下来，在身前伸直双腿，脚后跟保持在地面上", "弯曲肘部，将身体放低至地面，保持背部靠近长凳", "在底部暂停片刻，然后将自己推回到起始位置"] },
  "s-glute-bridge": { gif: "/exercise-gifs/s-glute-bridge.gif", steps: ["平躺，膝盖弯曲，双脚平放在地上", "将手臂放在身体两侧，手掌朝下", "启动臀肌和核心肌群，然后将臀部抬离地面，直到身体从膝盖到肩膀形成一条直线", "在顶部暂停片刻，挤压臀部"] },
  "s-incline-pushup": { gif: "/exercise-gifs/s-incline-pushup.gif", steps: ["将双手放在较高的表面上，例如长凳或台阶上，双手之间的距离略宽于肩宽", "将双腿伸到身后，放在脚掌上，从头到脚跟形成一条直线", "弯曲肘部，将胸部向升高的表面降低，保持身体呈一条直线", "在底部暂停片刻，然后伸直手臂将自己推回起始位置"] },
  "s-lat-pulldown": { gif: "/exercise-gifs/s-lat-pulldown.gif", steps: ["坐在高位下拉机上，膝盖位于护垫下方", "正手握住电缆杆，握距略宽于肩宽", "稍微向后倾斜，挺胸，保持下背部轻微的拱形", "将杠铃向下拉至上胸部，将肩胛骨挤压在一起"] },
  "s-leg-press": { gif: "/exercise-gifs/s-leg-press.gif", steps: ["将雪橇机的座椅和脚踏板调整到舒适的位置", "坐在雪橇机上，背部靠在靠背上，双脚与肩同宽放在踏板上", "握住座椅两侧的把手以保持稳定性", "伸展双腿，将脚踏板推离身体，脚后跟保持在脚踏板上"] },
  "s-lunge": { gif: "/exercise-gifs/s-lunge.gif", steps: ["站立，双脚分开与臀部同宽，双手放在臀部", "右脚向前迈出一大步，将身体降低到弓步位置", "将右膝盖弯曲约 90 度，保持膝盖与脚踝对齐", "用右脚推出并返回到起始位置"] },
  "s-machine-press": { gif: "/exercise-gifs/s-machine-press.gif", steps: ["调整座椅高度，将自己放在机器上，背部平放在垫子上", "正手握住手柄，肘部呈 90 度角", "向前推动手柄，直到手臂完全伸展，运动过程中呼气", "动作结束时短暂暂停，然后慢慢回到起始位置，同时吸气"] },
  "s-mountain": { gif: "/exercise-gifs/s-mountain.gif", steps: ["从高平板支撑位置开始，双手直接放在肩膀下方，身体呈一条直线", "启动你的核心并将你的右膝盖靠近你的胸部，然后快速切换并将你的左膝盖靠近你的胸部", "继续以跑步动作交替双腿，保持臀部较低，核心肌群参与", "在整个练习过程中保持稳定的节奏和均匀的呼吸"] },
  "s-pike-pushup": { gif: "/exercise-gifs/s-pike-pushup.gif", steps: ["从俯卧撑位置开始，双手分开略宽于肩宽，双脚并拢", "收紧核心肌群，将臀部抬向天花板，与身体形成倒V字形", "弯曲肘部，使上半身靠近地面，使上半身靠近地面", "当你下降时，将你的重心向前移动，并通过伸直手臂并抬起胸部来过渡到眼镜蛇姿势"] },
  "s-plank": { gif: "/exercise-gifs/s-plank.gif", steps: ["从高平板支撑位置开始，双手直接放在肩膀下方，身体从头到脚成一条直线", "调动你的核心和臀部以保持稳定的位置", "将躯干向右旋转，抬起右臂并向天花板延伸", "扭转时保持臀部和腿部稳定"] },
  "s-pullup": { gif: "/exercise-gifs/s-pullup.gif", steps: ["用中立握法（手掌相对）悬挂在引体向上杆上，双臂完全伸展", "启动你的核心并将肩胛骨挤压在一起", "弯曲肘部并将肘部向下推向臀部，将身体向上拉向杠铃", "继续拉，直到下巴位于杠铃上方"] },
  "s-pushup": { gif: "/exercise-gifs/s-pushup.gif", steps: ["从高位平板支撑开始，双手分开略宽于肩宽，双脚并拢", "弯曲肘部，调动核心力量，将身体压向地面，保持身体呈一条直线", "当你的胸部刚好高于地面时，暂停片刻，然后伸直手臂，将自己推回起始位置", "重复所需的重复次数"] },
  "s-rdl": { gif: "/exercise-gifs/s-rdl.gif", steps: ["双脚分开与肩同宽站立，双手各握一个哑铃，正握", "保持背部挺直，核心收紧，铰接臀部并将哑铃向地面降低，让膝盖稍微弯曲", "降低哑铃，直到感觉到腿筋拉伸，然后挤压臀肌并通过脚后跟推回到起始位置", "重复所需的重复次数"] },
  "s-seated-row": { gif: "/exercise-gifs/s-seated-row.gif", steps: ["坐在机器上，双脚平放在脚踏板上，膝盖稍微弯曲", "正手握住手柄，手掌朝下", "保持背部挺直，稍微向前倾斜，肘部保持轻微弯曲", "将手柄拉向身体，将肩胛骨挤压在一起"] },
  "s-side-plank": { gif: "/exercise-gifs/s-side-plank.gif", steps: ["首先侧躺，双腿伸展并叠放在一起", "用前臂支撑自己，将肘部保持在肩膀正下方", "启动你的核心并将臀部抬离地面，从头到脚形成一条直线", "在保持侧平板支撑位置的同时，将上面的腿抬向天花板，保持笔直"] },
  "s-squat": { gif: "/exercise-gifs/s-squat.gif", steps: ["站立，双脚分开与肩同宽，脚趾稍微外翻", "弯曲膝盖并将臀部向后推，将身体降低至蹲姿", "当你从深蹲中站起来时，将手臂伸过头顶，伸向天花板", "放下手臂并弯曲膝盖再次蹲下，回到起始位置"] },
  "s-water-row": { gif: "/exercise-gifs/s-water-row.gif", steps: ["双脚分开与肩同宽站立，膝盖稍微弯曲，双手各握一个哑铃，手掌朝向身体", "臀部向前弯曲，保持背部挺直，核心肌群参与", "让你的手臂垂直垂向地板，肘部稍微弯曲", "将哑铃拉向胸部，将肩胛骨挤压在一起"] },
  "w-high-knees": { gif: "/exercise-gifs/w-high-knees.gif", steps: ["面向墙壁站立，双脚分开与臀部同宽", "将双手放在墙上以获得支撑", "启动你的核心并将右膝抬向胸部，同时将左脚保持在地面上", "快速换腿，将左膝抬向胸部，然后将右脚放低"] },
  "w-jumping-jack": { gif: "/exercise-gifs/w-jumping-jack.gif", steps: ["双脚并拢站立，双臂放在身体两侧", "跳起来，分开双脚，将手臂举过头顶", "当你落地时，迅速跳回起始位置", "重复所需的重复次数"] },
  "x-hamstring": { gif: "/exercise-gifs/x-hamstring.gif", steps: ["双脚分开与肩同宽站立，双臂放在身体两侧", "腰部向前弯曲，保持背部挺直，膝盖稍微弯曲", "双手向下伸向脚趾，尽可能保持双腿伸直", "在底部停顿片刻，然后慢慢回到起始位置"] },
  "x-hip-flexor": { gif: "/exercise-gifs/x-hip-flexor.gif", steps: ["站直，双脚分开与肩同宽", "抓住一个稳定的物体作为支撑", "弯曲右膝，将右脚移向臀部，用右手抓住绳子", "慢慢地将右脚拉向臀部，感受右股四头肌的拉伸"] },
  "x-quad": { gif: "/exercise-gifs/x-quad.gif", steps: ["侧躺，双腿伸直", "弯曲上面的那条腿，用手抓住脚踝或脚", "轻轻地将脚踝或脚拉向臀部，直到感觉到股四头肌有拉伸感", "保持拉伸 20-30 秒"] },
  "x-shoulder": { gif: "/exercise-gifs/x-shoulder.gif", steps: ["站直，双脚分开与肩同宽", "将双臂伸直至前方，与肩同高", "双臂交叉在身体前方，右臂放在左臂上方", "手指交叉并将手掌压在一起"] },
  "s-bb-row": { gif: "/exercise-gifs/s-bb-row.gif", steps: ["站立，双脚分开与肩同宽，膝盖稍微弯曲", "臀部向前弯曲，同时保持背部挺直、挺胸", "正手握住杠铃，双手间距略宽于肩宽", "通过收缩肩胛骨并挤压背部肌肉，将杠铃拉向下胸部"] },
  "s-bb-squat": { gif: "/exercise-gifs/s-bb-squat.gif", steps: ["站立，双脚分开与肩同宽，脚趾稍微向外", "将杠铃放在上背部，将其放在斜方肌或三角肌后束上", "当你开始降低身体时，启动你的核心并保持胸部挺直", "弯曲膝盖和臀部，向后和向下推臀部，就像坐在椅子上一样"] },
  "s-db-lateral-raise": { gif: "/exercise-gifs/s-db-lateral-raise.gif", steps: ["双脚分开与肩同宽站立，双手各握一个哑铃，手掌朝向身体", "保持背部挺直并启动核心肌群", "将手臂向两侧抬起，直到与地板平行，保持肘部稍微弯曲", "在顶部暂停片刻，然后慢慢将手臂放回起始位置"] },
  "s-hammer-curl": { gif: "/exercise-gifs/s-hammer-curl.gif", steps: ["站直，双手各持一个哑铃，手掌朝向身体", "保持肘部靠近躯干，上臂保持静止", "呼气并弯举哑铃，同时收缩二头肌，将哑铃穿过身体拉向对侧的肩膀", "继续举起哑铃，直到二头肌完全收缩并且哑铃与肩部齐平"] },
  "s-cable-fly": { gif: "/exercise-gifs/s-cable-fly.gif", steps: ["将绳索把手连接到绳索机两侧胸部高度处", "站在机器的中央，一只脚稍微在另一只脚前面", "正手握住手柄，并将手臂向两侧伸展", "保持肘部轻微弯曲并保持轻微前倾，将双手在胸前合拢"] },
};

/** 读取动作演示(无则返回 undefined) */
export function demoOf(exerciseId: string): { gif: string; steps: string[] } | undefined {
  return EXERCISE_DEMO[exerciseId];
}
