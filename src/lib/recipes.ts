// 食谱库(纯数据)
// - 营养数值为每份估算(与配料表份量一致),用于展示与目标对比,非精确测量。
// - costYuan 为单份食材成本估算;minutes 为烹饪时长;difficulty 1-3。
// - ingredients.cat 用于购物清单分组。

import type { MealSlotType } from "@/types";

export type IngredientCat = "蛋白质" | "蔬果" | "主食" | "乳品" | "干货坚果" | "调味";

export interface RecipeIngredient {
  name: string;
  grams: number;
  cat: IngredientCat;
  note?: string;
}

export interface Recipe {
  id: string;
  name: string;
  emoji: string;
  slots: MealSlotType[];
  tags: string[]; // 高蛋白 / 快手 / 素食 / 微辣 / 低碳水 …
  difficulty: 1 | 2 | 3;
  minutes: number;
  costYuan: number;
  baseKcal: number; // 按下方配料与营养数据的每份热量
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  ingredients: RecipeIngredient[];
  steps: string[];
  substitutes: { for: string; options: string[] }[];
}

export const RECIPES: Recipe[] = [
  // ================= 早餐 =================
  {
    id: "bg-yogurt-oat", name: "酸奶奇亚燕麦杯", emoji: "🥣", slots: ["breakfast"],
    tags: ["高蛋白", "快手", "免烹饪"], difficulty: 1, minutes: 5, costYuan: 9, baseKcal: 300,
    kcal: 300, protein: 16, carbs: 38, fat: 8,
    ingredients: [
      { name: "无糖酸奶", grams: 150, cat: "乳品", note: "选无糖希腊酸奶更佳" },
      { name: "燕麦片", grams: 40, cat: "主食", note: "生燕麦/快熟燕麦" },
      { name: "蓝莓", grams: 60, cat: "蔬果", note: "可换当季莓果" },
      { name: "奇亚籽", grams: 5, cat: "干货坚果" },
    ],
    steps: [
      "燕麦片用少量热水或牛奶泡软(约3分钟)。",
      "杯中依次铺入酸奶、燕麦、蓝莓。",
      "撒奇亚籽,冷藏过夜风味更佳,也可即食。",
    ],
    substitutes: [
      { for: "无糖酸奶", options: ["无糖豆浆酸奶(豆乳过敏慎选)", "低脂牛奶+蛋白粉"] },
      { for: "蓝莓", options: ["草莓", "苹果丁", "冻干莓果"] },
    ],
  },
  {
    id: "bg-sandwich", name: "全麦鸡蛋芝士三明治", emoji: "🥪", slots: ["breakfast"],
    tags: ["高蛋白", "快手"], difficulty: 1, minutes: 10, costYuan: 7, baseKcal: 330,
    kcal: 330, protein: 17, carbs: 36, fat: 12,
    ingredients: [
      { name: "全麦面包", grams: 70, cat: "主食", note: "约2片" },
      { name: "鸡蛋", grams: 50, cat: "蛋白质", note: "1个" },
      { name: "低脂芝士片", grams: 20, cat: "乳品", note: "1片" },
      { name: "生菜", grams: 30, cat: "蔬果" },
      { name: "番茄", grams: 50, cat: "蔬果" },
    ],
    steps: [
      "不粘锅少油煎蛋(或水煮蛋切片)。",
      "全麦面包依次夹入生菜、番茄片、蛋、芝士。",
      "对折后可烤箱/平底锅烘1分钟,口感更好。",
    ],
    substitutes: [
      { for: "全麦面包", options: ["黑麦面包", "全麦贝果(减半)", "无麸质米面包"] },
      { for: "低脂芝士片", options: ["牛油果1/4个", "不加"] },
    ],
  },
  {
    id: "bg-steamed-egg", name: "虾仁蔬菜蒸蛋配吐司", emoji: "🍳", slots: ["breakfast"],
    tags: ["高蛋白"], difficulty: 1, minutes: 15, costYuan: 9, baseKcal: 320,
    kcal: 320, protein: 26, carbs: 14, fat: 15,
    ingredients: [
      { name: "鸡蛋", grams: 100, cat: "蛋白质", note: "2个" },
      { name: "虾仁", grams: 50, cat: "蛋白质" },
      { name: "菠菜", grams: 30, cat: "蔬果", note: "焯水切碎" },
      { name: "香油", grams: 2, cat: "调味" },
      { name: "全麦吐司", grams: 35, cat: "主食", note: "1片" },
    ],
    steps: [
      "鸡蛋加1.5倍温水打散,过筛后加菠菜碎。",
      "盖保鲜膜扎孔,水开后中火蒸8分钟,铺虾仁再蒸3分钟。",
      "出锅淋几滴香油生抽,配烤热的全麦吐司。",
    ],
    substitutes: [
      { for: "虾仁", options: ["鸡胸肉丁", "内酯豆腐(豆乳过敏慎选)", "不加"] },
      { for: "全麦吐司", options: ["蒸玉米半根", "小碗燕麦粥"] },
    ],
  },
  {
    id: "bg-purple-oatmeal", name: "紫薯燕麦牛奶粥", emoji: "🍠", slots: ["breakfast"],
    tags: ["快手", "高纤维"], difficulty: 1, minutes: 15, costYuan: 5, baseKcal: 285,
    kcal: 285, protein: 14, carbs: 50, fat: 2,
    ingredients: [
      { name: "紫薯", grams: 100, cat: "主食" },
      { name: "燕麦片", grams: 30, cat: "主食" },
      { name: "脱脂牛奶", grams: 250, cat: "乳品", note: "约1杯" },
    ],
    steps: [
      "紫薯去皮切丁,微波高火3分钟或蒸10分钟。",
      "燕麦与牛奶小火煮3分钟至浓稠。",
      "拌入紫薯丁压成泥即可。",
    ],
    substitutes: [
      { for: "脱脂牛奶", options: ["无糖豆浆(豆乳过敏慎选)", "水+鸡蛋1个"] },
      { for: "紫薯", options: ["红薯", "南瓜", "山药"] },
    ],
  },
  {
    id: "bg-corn-plate", name: "玉米水煮蛋早餐盘", emoji: "🌽", slots: ["breakfast"],
    tags: ["快手", "均衡"], difficulty: 1, minutes: 12, costYuan: 6, baseKcal: 300,
    kcal: 300, protein: 17, carbs: 30, fat: 13,
    ingredients: [
      { name: "甜玉米", grams: 90, cat: "主食", note: "半根" },
      { name: "鸡蛋", grams: 50, cat: "蛋白质", note: "1个" },
      { name: "无糖豆浆", grams: 250, cat: "乳品", note: "豆制品" },
      { name: "巴旦木", grams: 8, cat: "干货坚果", note: "约6颗" },
      { name: "小番茄", grams: 50, cat: "蔬果" },
    ],
    steps: [
      "玉米段与鸡蛋同锅煮8-10分钟。",
      "豆浆加热,小番茄洗净。",
      "摆盘,撒少许盐和黑椒在蛋上。",
    ],
    substitutes: [
      { for: "巴旦木", options: ["核桃", "南瓜籽", "不加"] },
      { for: "甜玉米", options: ["蒸红薯", "全麦馒头"] },
    ],
  },
  {
    id: "bg-pancake", name: "荞麦香蕉松饼", emoji: "🥞", slots: ["breakfast"],
    tags: ["快手"], difficulty: 2, minutes: 15, costYuan: 6, baseKcal: 290,
    kcal: 290, protein: 13, carbs: 46, fat: 7,
    ingredients: [
      { name: "荞麦粉", grams: 40, cat: "主食" },
      { name: "香蕉", grams: 50, cat: "蔬果", note: "半根压泥" },
      { name: "鸡蛋", grams: 50, cat: "蛋白质", note: "1个" },
      { name: "牛奶", grams: 50, cat: "乳品" },
      { name: "蜂蜜", grams: 5, cat: "调味", note: "可选" },
    ],
    steps: [
      "香蕉压泥,与鸡蛋、牛奶混合。",
      "拌入荞麦粉至无颗粒,静置2分钟。",
      "不粘锅小火,每面煎1-2分钟,淋蜂蜜。",
    ],
    substitutes: [
      { for: "荞麦粉", options: ["全麦粉", "燕麦粉(自制打碎)", "米糕粉(无麸质)"] },
      { for: "蜂蜜", options: ["不加", "无糖枫糖浆"] },
    ],
  },
  {
    id: "bg-tofu-pancake", name: "豆腐蔬菜蛋饼", emoji: "🫓", slots: ["breakfast"],
    tags: ["高蛋白", "快手"], difficulty: 2, minutes: 15, costYuan: 5, baseKcal: 225,
    kcal: 225, protein: 11, carbs: 16, fat: 11,
    ingredients: [
      { name: "嫩豆腐", grams: 80, cat: "蛋白质", note: "压干水分" },
      { name: "鸡蛋", grams: 50, cat: "蛋白质", note: "1个" },
      { name: "胡萝卜", grams: 30, cat: "蔬果", note: "擦丝" },
      { name: "全麦面粉", grams: 15, cat: "主食" },
      { name: "菜籽油", grams: 3, cat: "调味" },
    ],
    steps: [
      "豆腐压碎,与鸡蛋、胡萝卜丝、面粉、盐混合。",
      "不粘锅刷薄油,舀入面糊摊成小饼。",
      "中小火每面煎2-3分钟至金黄。",
    ],
    substitutes: [
      { for: "嫩豆腐", options: ["鸡胸肉泥", "虾仁碎"] },
      { for: "全麦面粉", options: ["土豆淀粉", "玉米粉"] },
    ],
  },

  // ================= 午餐 =================
  {
    id: "ln-chicken-quinoa", name: "香煎鸡胸藜麦沙拉", emoji: "🥗", slots: ["lunch", "dinner"],
    tags: ["高蛋白", "低碳水"], difficulty: 2, minutes: 25, costYuan: 15, baseKcal: 390,
    kcal: 390, protein: 36, carbs: 36, fat: 11,
    ingredients: [
      { name: "鸡胸肉", grams: 130, cat: "蛋白质" },
      { name: "藜麦", grams: 45, cat: "主食", note: "干重,煮熟约135g" },
      { name: "生菜", grams: 80, cat: "蔬果" },
      { name: "彩椒", grams: 60, cat: "蔬果" },
      { name: "橄榄油", grams: 6, cat: "调味" },
      { name: "柠檬汁", grams: 5, cat: "调味" },
    ],
    steps: [
      "藜麦洗净煮15分钟,沥干备用。",
      "鸡胸肉拍松,盐、黑椒、蒜粉腌5分钟,少油每面煎3-4分钟。",
      "蔬菜打底,码入藜麦与切片鸡胸,淋橄榄油+柠檬汁。",
    ],
    substitutes: [
      { for: "鸡胸肉", options: ["瘦牛肉", "虾仁", "老豆腐(豆乳过敏慎选)"] },
      { for: "藜麦", options: ["糙米饭", "荞麦面", "甜玉米粒"] },
    ],
  },
  {
    id: "ln-tomato-beef-noodle", name: "番茄牛腩荞麦面", emoji: "🍜", slots: ["lunch"],
    tags: [], difficulty: 2, minutes: 35, costYuan: 16, baseKcal: 470,
    kcal: 470, protein: 23, carbs: 49, fat: 18,
    ingredients: [
      { name: "牛腩", grams: 80, cat: "蛋白质" },
      { name: "荞麦面", grams: 60, cat: "主食", note: "干重" },
      { name: "番茄", grams: 150, cat: "蔬果", note: "约1个" },
      { name: "小白菜", grams: 50, cat: "蔬果" },
      { name: "菜籽油", grams: 4, cat: "调味" },
    ],
    steps: [
      "牛腩切块焯水;番茄去皮炒出沙。",
      "加牛腩与热水小火炖30分钟(可用高压锅缩短至10分钟)。",
      "荞麦面煮3分钟,小白菜烫熟;装碗浇汤,少盐调味。",
    ],
    substitutes: [
      { for: "牛腩", options: ["牛里脊(更快熟)", "鸡腿肉", "老豆腐"] },
      { for: "荞麦面", options: ["魔芋面(更低卡)", "全麦面", "米粉"] },
    ],
  },
  {
    id: "ln-steamed-fish", name: "清蒸鲈鱼配糙米饭", emoji: "🐟", slots: ["lunch", "dinner"],
    tags: ["高蛋白"], difficulty: 2, minutes: 25, costYuan: 18, baseKcal: 385,
    kcal: 385, protein: 33, carbs: 42, fat: 7,
    ingredients: [
      { name: "鲈鱼", grams: 150, cat: "蛋白质", note: "约1段" },
      { name: "糙米饭", grams: 150, cat: "主食" },
      { name: "西兰花", grams: 120, cat: "蔬果" },
      { name: "橄榄油", grams: 3, cat: "调味" },
      { name: "蒸鱼豉油", grams: 5, cat: "调味" },
    ],
    steps: [
      "鲈鱼两面划刀,铺姜丝,水开后大火蒸8-10分钟。",
      "西兰花焯2分钟,糙米饭提前备好(可用电饭煲预约)。",
      "鱼身淋蒸鱼豉油+热油激香,配饭和西兰花。",
    ],
    substitutes: [
      { for: "鲈鱼", options: ["鳕鱼", "龙利鱼", "鸡胸肉"] },
      { for: "糙米饭", options: ["杂粮饭", "藜麦饭", "蒸土豆"] },
    ],
  },
  {
    id: "ln-beef-rice", name: "黑椒牛肉杂粮饭", emoji: "🥩", slots: ["lunch"],
    tags: ["高蛋白"], difficulty: 2, minutes: 25, costYuan: 16, baseKcal: 410,
    kcal: 410, protein: 28, carbs: 55, fat: 7,
    ingredients: [
      { name: "牛里脊", grams: 100, cat: "蛋白质" },
      { name: "杂粮饭", grams: 180, cat: "主食" },
      { name: "彩椒", grams: 100, cat: "蔬果" },
      { name: "洋葱", grams: 30, cat: "蔬果" },
      { name: "菜籽油", grams: 4, cat: "调味" },
      { name: "黑椒酱", grams: 5, cat: "调味", note: "选低钠" },
    ],
    steps: [
      "牛肉逆纹切薄片,用少许可和黑椒酱抓匀腌5分钟。",
      "热锅快炒牛肉至变色盛出;余油炒彩椒洋葱1分钟。",
      "回锅合炒20秒,盖在杂粮饭上。",
    ],
    substitutes: [
      { for: "牛里脊", options: ["鸡腿肉(去皮)", "虾仁", "杏鲍菇+豆腐(素食)"] },
      { for: "杂粮饭", options: ["糙米饭", "荞麦面", "红薯"] },
    ],
  },
  {
    id: "ln-shrimp-rice", name: "虾仁滑蛋糙米盖饭", emoji: "🍤", slots: ["lunch", "dinner"],
    tags: ["高蛋白", "快手"], difficulty: 1, minutes: 20, costYuan: 15, baseKcal: 390,
    kcal: 390, protein: 34, carbs: 42, fat: 9,
    ingredients: [
      { name: "虾仁", grams: 100, cat: "蛋白质" },
      { name: "鸡蛋", grams: 50, cat: "蛋白质", note: "1个" },
      { name: "糙米饭", grams: 160, cat: "主食" },
      { name: "青豆", grams: 20, cat: "蔬果" },
      { name: "菜籽油", grams: 3, cat: "调味" },
    ],
    steps: [
      "虾仁用料酒、白胡椒腌5分钟;鸡蛋打散加盐。",
      "少油滑炒虾仁至变红,倒入蛋液小火推熟。",
      "盖在热糙米饭上,撒葱花。",
    ],
    substitutes: [
      { for: "虾仁", options: ["鸡胸肉丁", "鳕鱼块", "豆腐丁(豆乳过敏慎选)"] },
      { for: "糙米饭", options: ["杂粮饭", "藜麦", "紫薯"] },
    ],
  },
  {
    id: "ln-chicken-pepper", name: "彩椒鸡丁杂粮碗", emoji: "🍛", slots: ["lunch"],
    tags: ["高蛋白"], difficulty: 2, minutes: 25, costYuan: 14, baseKcal: 445,
    kcal: 445, protein: 35, carbs: 52, fat: 11,
    ingredients: [
      { name: "鸡胸肉", grams: 130, cat: "蛋白质" },
      { name: "杂粮饭", grams: 160, cat: "主食" },
      { name: "彩椒", grams: 120, cat: "蔬果" },
      { name: "腰果", grams: 8, cat: "干货坚果", note: "约5颗" },
      { name: "菜籽油", grams: 3, cat: "调味" },
    ],
    steps: [
      "鸡胸切丁,用生抽、淀粉抓匀腌5分钟。",
      "热锅少油炒鸡丁至八成熟,加彩椒炒1分钟。",
      "撒腰果,盖杂粮饭装碗。",
    ],
    substitutes: [
      { for: "腰果", options: ["花生(坚果过敏慎选)", "南瓜籽", "不加"] },
      { for: "鸡胸肉", options: ["瘦牛肉", "鸡肝(补铁)", "老豆腐"] },
    ],
  },
  {
    id: "ln-tofu-soup", name: "韩式嫩豆腐蔬菜汤配杂粮饭", emoji: "🍲", slots: ["lunch", "dinner"],
    tags: ["快手", "微辣"], difficulty: 1, minutes: 25, costYuan: 11, baseKcal: 365,
    kcal: 365, protein: 21, carbs: 41, fat: 11,
    ingredients: [
      { name: "嫩豆腐", grams: 150, cat: "蛋白质" },
      { name: "鸡蛋", grams: 50, cat: "蛋白质", note: "1个" },
      { name: "杂粮饭", grams: 150, cat: "主食" },
      { name: "香菇", grams: 30, cat: "蔬果" },
      { name: "西葫芦", grams: 50, cat: "蔬果" },
      { name: "香油", grams: 2, cat: "调味" },
    ],
    steps: [
      "香菇、西葫芦炒香,加水500ml煮开。",
      "下嫩豆腐块煮3分钟,淋蛋液成花。",
      "滴香油、少许韩式辣酱(可选),配杂粮饭。",
    ],
    substitutes: [
      { for: "嫩豆腐", options: ["内酯豆腐", "鸡胸肉丝", "虾仁"] },
      { for: "杂粮饭", options: ["糙米饭", "荞麦面"] },
    ],
  },
  {
    id: "ln-tuna-rice", name: "低脂金枪鱼拌饭", emoji: "🍙", slots: ["lunch"],
    tags: ["高蛋白", "快手"], difficulty: 1, minutes: 15, costYuan: 13, baseKcal: 400,
    kcal: 400, protein: 29, carbs: 48, fat: 8,
    ingredients: [
      { name: "水浸金枪鱼罐头", grams: 80, cat: "蛋白质" },
      { name: "糙米饭", grams: 170, cat: "主食" },
      { name: "紫甘蓝", grams: 50, cat: "蔬果", note: "切细丝" },
      { name: "胡萝卜", grams: 30, cat: "蔬果", note: "擦丝" },
      { name: "海苔", grams: 2, cat: "调味" },
      { name: "香油", grams: 3, cat: "调味" },
      { name: "鸡蛋", grams: 50, cat: "蛋白质", note: "可选,1个" },
    ],
    steps: [
      "糙米饭趁热铺盘,码上蔬菜丝。",
      "金枪鱼沥干放在中间,煎一个太阳蛋(可选)。",
      "淋香油+生抽+少许芝麻,海苔碎装饰。",
    ],
    substitutes: [
      { for: "水浸金枪鱼罐头", options: ["水浸鲑鱼罐头", "白煮虾", "鸡蛋2个"] },
      { for: "糙米饭", options: ["杂粮饭", "藜麦"] },
    ],
  },

  // ================= 晚餐 =================
  {
    id: "dn-shrimp-broccoli", name: "白灼虾配蒜蓉西兰花", emoji: "🦐", slots: ["dinner", "lunch"],
    tags: ["高蛋白", "快手", "低碳水"], difficulty: 1, minutes: 20, costYuan: 16, baseKcal: 345,
    kcal: 345, protein: 31, carbs: 29, fat: 6,
    ingredients: [
      { name: "虾仁", grams: 150, cat: "蛋白质", note: "或带壳鲜虾" },
      { name: "西兰花", grams: 200, cat: "蔬果" },
      { name: "杂粮饭", grams: 100, cat: "主食", note: "小碗" },
      { name: "大蒜", grams: 10, cat: "调味" },
      { name: "菜籽油", grams: 4, cat: "调味" },
    ],
    steps: [
      "水开加姜片料酒,虾煮2分钟变红捞出。",
      "蒜末小火炒香,下西兰花炒2分钟,点水焖1分钟。",
      "配小碗杂粮饭,生抽+醋做蘸汁。",
    ],
    substitutes: [
      { for: "虾仁", options: ["鸡胸肉", "鳕鱼", "老豆腐"] },
      { for: "杂粮饭", options: ["蒸玉米", "红薯", "不加(更低卡)"] },
    ],
  },
  {
    id: "dn-salmon-asparagus", name: "香烤三文鱼配芦笋", emoji: "🍣", slots: ["dinner"],
    tags: ["高蛋白"], difficulty: 2, minutes: 30, costYuan: 28, baseKcal: 400,
    kcal: 400, protein: 27, carbs: 23, fat: 18,
    ingredients: [
      { name: "三文鱼", grams: 120, cat: "蛋白质" },
      { name: "芦笋", grams: 150, cat: "蔬果" },
      { name: "小土豆", grams: 120, cat: "主食" },
      { name: "柠檬", grams: 5, cat: "蔬果", note: "挤汁" },
      { name: "橄榄油", grams: 3, cat: "调味" },
    ],
    steps: [
      "小土豆对半切煮8分钟;烤箱预热200°C。",
      "三文鱼与芦笋铺烤盘,淋橄榄油、盐、黑椒、柠檬汁。",
      "烤12-15分钟至鱼肉可轻松剥离。",
    ],
    substitutes: [
      { for: "三文鱼", options: ["鳕鱼(更低脂)", "鲈鱼", "鸡腿(去皮)"] },
      { for: "芦笋", options: ["西兰花", "四季豆", "西葫芦"] },
    ],
  },
  {
    id: "dn-chicken-shrimp-soup", name: "冬瓜虾仁汤配凉拌鸡丝", emoji: "🥣", slots: ["dinner"],
    tags: ["高蛋白", "低卡"], difficulty: 2, minutes: 25, costYuan: 14, baseKcal: 270,
    kcal: 270, protein: 31, carbs: 19, fat: 5,
    ingredients: [
      { name: "鸡胸肉", grams: 80, cat: "蛋白质", note: "煮熟撕丝" },
      { name: "虾仁", grams: 60, cat: "蛋白质" },
      { name: "冬瓜", grams: 150, cat: "蔬果" },
      { name: "黄瓜", grams: 80, cat: "蔬果" },
      { name: "粉丝", grams: 20, cat: "主食", note: "干重" },
      { name: "香油", grams: 3, cat: "调味" },
    ],
    steps: [
      "鸡胸冷水下锅煮8分钟,撕成细丝,与黄瓜丝、生抽醋香油凉拌。",
      "冬瓜片与虾仁煮汤5分钟,下泡软的粉丝煮1分钟。",
      "一凉一热搭配,清爽低负担。",
    ],
    substitutes: [
      { for: "虾仁", options: ["干贝", "不加"] },
      { for: "粉丝", options: ["魔芋丝", "荞麦面少量"] },
    ],
  },
  {
    id: "dn-mapo-tofu", name: "少油麻婆豆腐配烫青菜", emoji: "🌶️", slots: ["dinner"],
    tags: ["微辣", "高蛋白"], difficulty: 2, minutes: 25, costYuan: 12, baseKcal: 365,
    kcal: 365, protein: 25, carbs: 27, fat: 13,
    ingredients: [
      { name: "豆腐", grams: 200, cat: "蛋白质" },
      { name: "牛肉末", grams: 30, cat: "蛋白质", note: "瘦" },
      { name: "小白菜", grams: 200, cat: "蔬果" },
      { name: "杂粮饭", grams: 80, cat: "主食", note: "小半碗" },
      { name: "菜籽油", grams: 4, cat: "调味" },
      { name: "豆瓣酱", grams: 5, cat: "调味", note: "低钠" },
    ],
    steps: [
      "少油炒散牛肉末,加豆瓣酱出红油。",
      "加豆腐块与50ml水,烧3分钟,水淀粉薄芡。",
      "小白菜烫熟垫底或配餐,撒花椒面与葱花。",
    ],
    substitutes: [
      { for: "牛肉末", options: ["猪肉末(瘦)", "不加(纯素版)"] },
      { for: "豆瓣酱", options: ["减半", "生抽+白胡椒(不辣版本)"] },
    ],
  },
  {
    id: "dn-chicken-cold-noodle", name: "鸡丝荞麦冷面", emoji: "🍝", slots: ["dinner", "lunch"],
    tags: ["快手"], difficulty: 1, minutes: 20, costYuan: 10, baseKcal: 380,
    kcal: 380, protein: 24, carbs: 40, fat: 8,
    ingredients: [
      { name: "鸡胸肉", grams: 70, cat: "蛋白质" },
      { name: "荞麦面", grams: 50, cat: "主食", note: "干重" },
      { name: "黄瓜", grams: 60, cat: "蔬果", note: "切丝" },
      { name: "鸡蛋", grams: 50, cat: "蛋白质", note: "1个" },
      { name: "芝麻酱", grams: 8, cat: "调味", note: "温水澥开" },
      { name: "生抽", grams: 5, cat: "调味" },
    ],
    steps: [
      "鸡胸煮熟撕丝;鸡蛋摊成蛋皮切丝。",
      "荞麦面煮3分钟过凉水。",
      "调芝麻酱汁(芝麻酱+生抽+醋+蒜末),拌入所有食材。",
    ],
    substitutes: [
      { for: "荞麦面", options: ["魔芋面", "全麦面"] },
      { for: "芝麻酱", options: ["花生酱(坚果过敏慎选)", "生抽+香油"] },
    ],
  },
  {
    id: "dn-codon-fish", name: "蒜香龙利鱼烤时蔬", emoji: "🐡", slots: ["dinner"],
    tags: ["高蛋白", "低碳水"], difficulty: 1, minutes: 30, costYuan: 17, baseKcal: 310,
    kcal: 310, protein: 32, carbs: 22, fat: 6,
    ingredients: [
      { name: "龙利鱼柳", grams: 180, cat: "蛋白质" },
      { name: "西兰花", grams: 100, cat: "蔬果" },
      { name: "彩椒", grams: 80, cat: "蔬果" },
      { name: "小土豆", grams: 100, cat: "主食" },
      { name: "橄榄油", grams: 4, cat: "调味" },
    ],
    steps: [
      "龙利鱼用蒜蓉、盐、黑椒腌10分钟。",
      "时蔬与土豆块铺底,鱼放上层,淋橄榄油。",
      "200°C烤15-18分钟,挤柠檬汁(可选)。",
    ],
    substitutes: [
      { for: "龙利鱼柳", options: ["鳕鱼", "鲈鱼", "鸡胸肉"] },
      { for: "小土豆", options: ["南瓜", "胡萝卜", "不加"] },
    ],
  },
  {
    id: "dn-tomato-tofu-soup", name: "番茄豆腐蛋花汤配全麦馒头", emoji: "🍅", slots: ["dinner"],
    tags: ["快手", "素食友好"], difficulty: 1, minutes: 20, costYuan: 8, baseKcal: 385,
    kcal: 385, protein: 17, carbs: 43, fat: 8,
    ingredients: [
      { name: "番茄", grams: 150, cat: "蔬果", note: "1个" },
      { name: "豆腐", grams: 100, cat: "蛋白质" },
      { name: "鸡蛋", grams: 50, cat: "蛋白质", note: "1个" },
      { name: "全麦馒头", grams: 80, cat: "主食", note: "约半个" },
      { name: "小白菜", grams: 80, cat: "蔬果" },
      { name: "香油", grams: 2, cat: "调味" },
    ],
    steps: [
      "番茄炒软出汁,加水600ml煮开。",
      "下豆腐块煮2分钟,淋蛋液,放小白菜。",
      "盐、白胡椒、香油调味,配蒸热的馒头。",
    ],
    substitutes: [
      { for: "全麦馒头", options: ["杂粮饭小碗", "蒸紫薯", "荞麦面少量"] },
      { for: "豆腐", options: ["鸡蛋2个", "鸡胸肉丝"] },
    ],
  },
  {
    id: "dn-chicken-cucumber", name: "凉拌手撕鸡配黄瓜", emoji: "🐔", slots: ["dinner"],
    tags: ["高蛋白", "低碳水"], difficulty: 2, minutes: 25, costYuan: 13, baseKcal: 310,
    kcal: 310, protein: 23, carbs: 28, fat: 9,
    ingredients: [
      { name: "去皮鸡腿肉", grams: 100, cat: "蛋白质" },
      { name: "黄瓜", grams: 150, cat: "蔬果" },
      { name: "粉丝", grams: 30, cat: "主食", note: "干重" },
      { name: "大蒜", grams: 10, cat: "调味" },
      { name: "香油", grams: 4, cat: "调味" },
      { name: "生抽", grams: 5, cat: "调味" },
    ],
    steps: [
      "鸡腿肉煮熟放凉,手撕成条。",
      "粉丝煮3分钟过凉;黄瓜拍碎切段。",
      "蒜泥+生抽+醋+香油调成汁,全部拌匀。",
    ],
    substitutes: [
      { for: "去皮鸡腿肉", options: ["鸡胸肉", "瘦猪里脊"] },
      { for: "粉丝", options: ["魔芋丝", "黄瓜加量(低碳版)"] },
    ],
  },

  // ================= 加餐 =================
  {
    id: "sn-yogurt-nuts", name: "希腊酸奶配巴旦木", emoji: "🥛", slots: ["snack"],
    tags: ["高蛋白", "快手"], difficulty: 1, minutes: 2, costYuan: 4, baseKcal: 130,
    kcal: 130, protein: 10, carbs: 6, fat: 7,
    ingredients: [
      { name: "无糖希腊酸奶", grams: 120, cat: "乳品" },
      { name: "巴旦木", grams: 10, cat: "干货坚果", note: "约8颗" },
    ],
    steps: ["酸奶倒入小碗。", "巴旦木拍碎撒上即可。"],
    substitutes: [
      { for: "巴旦木", options: ["核桃", "腰果", "南瓜籽"] },
      { for: "无糖希腊酸奶", options: ["无糖酸奶", "低脂牛奶+鸡蛋"] },
    ],
  },
  {
    id: "sn-apple-egg", name: "苹果配水煮蛋", emoji: "🍎", slots: ["snack"],
    tags: ["快手", "免烹饪"], difficulty: 1, minutes: 8, costYuan: 3, baseKcal: 150,
    kcal: 150, protein: 6, carbs: 21, fat: 5,
    ingredients: [
      { name: "苹果", grams: 150, cat: "蔬果", note: "约1个小的" },
      { name: "鸡蛋", grams: 50, cat: "蛋白质", note: "1个" },
    ],
    steps: ["鸡蛋冷水下锅煮8分钟。", "苹果洗净切块,搭配食用。"],
    substitutes: [
      { for: "苹果", options: ["梨", "橙子", "猕猴桃2个"] },
      { for: "鸡蛋", options: ["无糖酸奶100g", "豆浆200ml(豆乳过敏慎选)"] },
    ],
  },
  {
    id: "sn-banana-soy", name: "香蕉配无糖豆浆", emoji: "🍌", slots: ["snack"],
    tags: ["快手", "素食"], difficulty: 1, minutes: 3, costYuan: 3, baseKcal: 140,
    kcal: 140, protein: 8, carbs: 26, fat: 3,
    ingredients: [
      { name: "香蕉", grams: 100, cat: "蔬果", note: "约1根小的" },
      { name: "无糖豆浆", grams: 200, cat: "乳品", note: "豆制品" },
    ],
    steps: ["豆浆加热或常温皆可。", "香蕉作为训练前后快碳补充。"],
    substitutes: [
      { for: "无糖豆浆", options: ["脱脂牛奶", "无糖酸奶"] },
      { for: "香蕉", options: ["蒸红薯", "全麦面包1片"] },
    ],
  },
  {
    id: "sn-tomato-cheese", name: "小番茄配奶酪棒", emoji: "🧀", slots: ["snack"],
    tags: ["快手", "免烹饪"], difficulty: 1, minutes: 2, costYuan: 3, baseKcal: 75,
    kcal: 75, protein: 5, carbs: 3, fat: 4,
    ingredients: [
      { name: "小番茄", grams: 120, cat: "蔬果" },
      { name: "低脂奶酪棒", grams: 20, cat: "乳品", note: "1支" },
    ],
    steps: ["洗净即食,适合训练前快速补充。"],
    substitutes: [
      { for: "低脂奶酪棒", options: ["低脂牛奶200ml", "无糖酸奶100g"] },
    ],
  },
  {
    id: "sn-cucumber-hummus", name: "黄瓜条配鹰嘴豆泥", emoji: "🥒", slots: ["snack"],
    tags: ["素食", "快手"], difficulty: 1, minutes: 5, costYuan: 3, baseKcal: 95,
    kcal: 95, protein: 3, carbs: 8, fat: 5,
    ingredients: [
      { name: "黄瓜", grams: 100, cat: "蔬果", note: "切条" },
      { name: "鹰嘴豆泥", grams: 40, cat: "干货坚果", note: "豆制品" },
    ],
    steps: ["鹰嘴豆泥可自制:熟鹰嘴豆+蒜+柠檬汁+少许橄榄油打泥。", "黄瓜条蘸食。"],
    substitutes: [
      { for: "鹰嘴豆泥", options: ["无糖希腊酸奶香草蘸酱", "低脂奶油奶酪"] },
    ],
  },
  {
    id: "sn-sweet-potato", name: "蒸红薯配无糖酸奶", emoji: "🍠", slots: ["snack"],
    tags: ["快手", "素食"], difficulty: 1, minutes: 10, costYuan: 3, baseKcal: 125,
    kcal: 125, protein: 6, carbs: 20, fat: 1,
    ingredients: [
      { name: "红薯", grams: 120, cat: "主食" },
      { name: "无糖酸奶", grams: 80, cat: "乳品" },
    ],
    steps: ["红薯蒸15分钟(微波8分钟)。", "蘸无糖酸奶食用,饱腹感强。"],
    substitutes: [
      { for: "红薯", options: ["紫薯", "山药", "蒸玉米"] },
    ],
  },

  // ================= 增肌向(大容量) =================
  {
    id: "bg-bulk-oats", name: "牛奶香蕉花生燕麦杯", emoji: "🥣", slots: ["breakfast"],
    tags: ["高蛋白", "增肌", "快手"], difficulty: 1, minutes: 10, costYuan: 12, baseKcal: 680,
    kcal: 680, protein: 33, carbs: 92, fat: 21,
    ingredients: [
      { name: "燕麦片", grams: 80, cat: "主食" },
      { name: "牛奶", grams: 300, cat: "乳品" },
      { name: "香蕉", grams: 100, cat: "蔬果", note: "1根" },
      { name: "花生酱", grams: 15, cat: "干货坚果" },
      { name: "鸡蛋", grams: 50, cat: "蛋白质", note: "水煮1个" },
    ],
    steps: ["燕麦加牛奶微波3分钟或小火煮5分钟。", "拌入花生酱,香蕉切片铺面。", "另水煮蛋1个同吃。"],
    substitutes: [
      { for: "花生酱", options: ["无糖杏仁酱", "腰果酱", "一勺乳清蛋白粉"] },
      { for: "牛奶", options: ["无糖豆浆", "高钙燕麦奶"] },
    ],
  },
  {
    id: "ln-bulk-beef-rice", name: "黑椒牛里脊双份糙米饭", emoji: "🥩", slots: ["lunch", "dinner"],
    tags: ["高蛋白", "增肌"], difficulty: 2, minutes: 30, costYuan: 24, baseKcal: 660,
    kcal: 660, protein: 43, carbs: 72, fat: 22,
    ingredients: [
      { name: "牛里脊", grams: 130, cat: "蛋白质" },
      { name: "糙米饭", grams: 260, cat: "主食", note: "熟重,约110g生米" },
      { name: "西兰花", grams: 150, cat: "蔬果" },
      { name: "番茄", grams: 100, cat: "蔬果" },
      { name: "橄榄油", grams: 8, cat: "调味" },
      { name: "黑胡椒", grams: 2, cat: "调味" },
    ],
    steps: ["牛里脊切条,黑胡椒+少许盐腌10分钟。", "不粘锅少油大火煎2分钟,断生即起。", "西兰花焯水,番茄切块同炒。", "全部盖在双份糙米饭上。"],
    substitutes: [
      { for: "牛里脊", options: ["鸡胸肉", "猪里脊", "虾仁"] },
      { for: "糙米饭", options: ["白米饭+杂粮", "蒸土豆", "意面"] },
    ],
  },
  {
    id: "dn-bulk-salmon-potato", name: "香烤三文鱼配大份土豆", emoji: "🐟", slots: ["dinner", "lunch"],
    tags: ["高蛋白", "增肌", "深海鱼"], difficulty: 2, minutes: 30, costYuan: 30, baseKcal: 600,
    kcal: 600, protein: 38, carbs: 48, fat: 26,
    ingredients: [
      { name: "三文鱼", grams: 140, cat: "蛋白质" },
      { name: "马铃薯", grams: 300, cat: "主食" },
      { name: "芦笋", grams: 120, cat: "蔬果" },
      { name: "橄榄油", grams: 6, cat: "调味" },
      { name: "柠檬", grams: 20, cat: "调味" },
    ],
    steps: ["马铃薯切块煮8分,烤箱200℃烤15分钟。", "三文鱼抹橄榄油烤10分钟,柠檬汁提味。", "芦笋同盘烤5分钟。"],
    substitutes: [
      { for: "三文鱼", options: ["鳕鱼", "鸡腿排", "龙利鱼"] },
      { for: "马铃薯", options: ["红薯", "糙米饭", "意面"] },
    ],
  },
  {
    id: "sn-bulk-shake", name: "增肌香蕉燕麦奶昔", emoji: "🥤", slots: ["snack"],
    tags: ["高蛋白", "增肌", "免烹饪", "素食"], difficulty: 1, minutes: 5, costYuan: 9, baseKcal: 530,
    kcal: 530, protein: 26, carbs: 76, fat: 14,
    ingredients: [
      { name: "牛奶", grams: 300, cat: "乳品" },
      { name: "香蕉", grams: 120, cat: "蔬果" },
      { name: "燕麦片", grams: 40, cat: "主食" },
      { name: "花生酱", grams: 15, cat: "干货坚果" },
      { name: "无糖酸奶", grams: 100, cat: "乳品" },
    ],
    steps: ["全部材料入料理杯打30秒。", "训练后30分钟内喝掉,补充碳水+蛋白质。"],
    substitutes: [
      { for: "花生酱", options: ["无糖杏仁酱", "一勺乳清蛋白粉"] },
      { for: "燕麦片", options: ["即食燕麦", "半根红薯蒸熟打匀"] },
    ],
  },
];

export const RECIPE_MAP: Record<string, Recipe> = Object.fromEntries(RECIPES.map((r) => [r.id, r]));

export const INGREDIENT_CATS: IngredientCat[] = ["蛋白质", "蔬果", "主食", "乳品", "干货坚果", "调味"];

/** 常见过敏原 → 食材关键词(命中即排除该食谱) */
export const ALLERGEN_MAP: Record<string, string[]> = {
  花生: ["花生", "花生酱"],
  坚果: ["坚果", "巴旦木", "核桃", "腰果", "杏仁", "南瓜籽", "芝麻"],
  牛奶: ["牛奶", "酸奶", "奶酪", "芝士", "奶油"],
  鸡蛋: ["鸡蛋", "蛋液", "蛋皮", "蛋黄", "蛋白"],
  大豆: ["豆浆", "豆腐", "黄豆", "鹰嘴豆", "豆乳", "毛豆", "豆制品"],
  海鲜: ["虾", "鱼", "鳕", "鲈", "鲑", "三文", "龙利", "金枪", "贝", "蟹", "海鲜", "干贝", "海苔", "蛤"],
  麸质: ["面包", "吐司", "馒头", "面条", "面粉", "荞麦", "燕麦", "贝果", "米粉"],
};
