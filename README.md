# FitPlate 🥗 — 健身减脂规划 Web 应用

面向希望科学减脂、规律训练的普通用户:填写基本信息、目标与偏好后,自动生成**每日训练计划**与**每日减脂餐配方**,支持打卡、调整、重新生成,并可导出周期计划表、饮食规划表与购物清单。

> ⚠️ **免责声明**:FitPlate 生成的一切热量目标、宏量营养素分配、训练计划与食谱均为基于公开健康指南的参考估算,**不构成医疗诊断、治疗或营养处方**。涉及疾病、孕期/哺乳期、未成年人或饮食障碍史时,请先咨询医生或注册营养师。

---

## 1. 产品信息架构与页面清单

```
FitPlate
├── 公开
│   ├── /login            登录 / 注册(演示账号:demo@fitplate.app / fitplate123)
│   └── /api/*            REST API(见 §3)
└── 需登录(中间件保护)
    ├── /onboarding       用户档案问卷:3 步(基本信息 → 目标与训练 → 饮食偏好),带实时代谢预估;可随时回来编辑
    ├── /today            ★ 首页「今日计划」:训练卡(四区块+要点+打卡+强度档+替换/编辑动作)、
    │                     四餐卡(图片/热量/打卡/换一道/调份量)、完成度进度环、营养素对比图、
    │                     教练提示(AI/规则)、参考来源
    ├── /plan             周视图(健身计划表 + 饮食规划表 + 周完成度图)/ 月历视图;
    │                     打印样式、导出 PDF(打印对话框)、CSV 导出(训练/饮食/购物)
    ├── /meal/[date]/[slot]  食谱详情:成品图、营养、食材克数、步骤、烹饪时长、替代食材、换一道/调份量
    ├── /shopping         购物清单:按食材自动合并克数、分组、勾选、范围切换、打印/CSV
    └── /sources          可信来源库 + 联网检索(白名单域名),展示标题/链接/访问日期
```

## 2. 数据模型(Prisma / PostgreSQL)

```
User 1 ─── 1 Profile          档案:身体数据、目标、运动基础、器械、饮食偏好/过敏/忌口、预算、烹饪时长、特殊状况
     ├── * PlanDay            每日训练:date、focus、isTraining、intensity(light/standard/plus)、
     │                        blocks(JSON: warmup/strength/cardio/stretch)、aiTips、sources、completed
     └── * MealDay            每日饮食:date、targetKcal/P/C/F、slots(JSON: 四餐完整内容)、
                              completedSlots、seed、sources

唯一约束:(userId, date) 各一份;所有 JSON 写入前经 zod 校验。
```

见 [`prisma/schema.prisma`](prisma/schema.prisma)。

## 3. API 路由(均返回 `{ ok: true, data }` 或 `{ ok: false, error }`)

| 方法 | 路由 | 说明 |
|---|---|---|
| POST | `/api/register` | 注册 `{name,email,password}` → `201 {id,email,name}` |
| GET/PUT | `/api/profile` | 读取/保存档案问卷(PUT 会把起始日重置为今天) |
| GET | `/api/plan?from&to` | 周期内训练日列表(含 blocks/aiTips/sources/completed) |
| POST | `/api/plan` | 生成/重生成 `{scope:"all"\|"day", date?}` |
| PATCH | `/api/plan/day` | 编辑单日训练 `{date, intensity?}`(自动重缩放)/ `{date, blocks?}` / `{date, completed?}` |
| GET | `/api/meals?from&to` | 周期内饮食日列表(含四餐/目标/打卡) |
| POST | `/api/meals?scope=all\|day&date=` | 生成/重生成饮食 |
| PATCH | `/api/meals/day` | 单餐 `{date, slot, action:"swap"}` 或 `{date, slot, action:"scale", scale}` |
| POST | `/api/checkin` | 打卡 `{date, kind:"workout"\|"breakfast"\|"lunch"\|"dinner"\|"snack", value}` |
| GET | `/api/shopping-list?from&to` | 购物清单(同名食材合并) |
| GET | `/api/export/csv?type=workouts\|meals\|shopping&from&to` | CSV 附件(带 BOM,Excel 友好) |
| GET | `/api/img?seed&emoji&label&q` | 图片服务:配置 PEXELS_API_KEY 时 302 真实照片,否则本地 SVG 占位图 |
| GET | `/api/search?q=` | 可信来源检索(白名单+去重+缓存),结果含访问日期 |
| GET | `/api/ai/tip?date=` | 教练建议(AI 或规则引擎,含缓存) |
| * | `/api/auth/[...nextauth]` | NextAuth(Auth.js)凭据登录 |

**请求/响应示例**

```bash
# 登录(拿 cookie)后:
curl -X POST localhost:3000/api/plan -H 'Content-Type: application/json' \
  -b cookie.txt -d '{"scope":"all"}'
# → {"ok":true,"data":{"from":"2026-08-30","count":30,"skippedCompleted":0,"dates":[...]}}

curl -X PATCH localhost:3000/api/meals/day -H 'Content-Type: application/json' \
  -b cookie.txt -d '{"date":"2026-08-30","slot":"lunch","action":"swap"}'
# → {"ok":true,"data":{ "recipeId":"ln-beef-rice", "name":"黑椒牛肉杂粮饭", ... }}

curl -X POST localhost:3000/api/checkin -H 'Content-Type: application/json' \
  -b cookie.txt -d '{"date":"2026-08-30","kind":"workout","value":true}'
# → {"ok":true,"data":{"kind":"workout","value":true,"date":"2026-08-30"}}
```

## 4. UI 设计与组件结构

- **风格**:简洁、积极、专业。品牌绿(emerald)+ 琥珀点缀;卡片圆角 16px、浅投影;emoji + 渐变占位图保证可读性与版权安全;深色模式(class 策略,本地持久化);桌面/移动自适应(移动端底部标签栏)。
- **组件**:
  - `components/ui.tsx` — Card / Badge / CheckButton / Progress / Stat / Skeleton / EmptyState / Modal / Toast / Disclaimer
  - `components/charts.tsx` — Recharts:ProgressRing(完成度)、WeekBars(周完成度)、MacroBars(营养素对比)
  - `components/nav.tsx` — 顶部导航 + 主题切换 + 退出
  - `components/smart-image.tsx` — 图片加载失败自动降级占位图
  - 功能组件:onboarding-form / today-client / plan-client / recipe-actions / shopping-client / source-search
- **状态体验**:各页 loading.tsx 骨架屏、全局 error.tsx 重试、空状态引导生成、失败 Toast + 重新生成。

## 5. 分阶段开发计划

| 阶段 | 范围 | 状态 |
|---|---|---|
| **MVP(当前)** | 问卷、热量/宏量目标推导、7/14/30 天训练日历、三餐+加餐食谱、打卡、周计划表、食谱详情、购物清单、CSV/打印导出、NextAuth 登录、可信来源检索、占位图降级 | ✅ 已完成 |
| v1.1 | AI 全量生成(结构化 JSON 出计划/食谱,当前为可选「教练提示」增强)、图片搜索接入默认图、体重记录曲线、PWA | 🚧 |
| v1.2 | 多人/家庭计划、训练视频演示、语音打卡、微信/邮箱登录、部署一键化 | 📋 |
| v2.0 | 可穿戴设备同步(心率/步数)、智能周回顾与自适应计划、社交挑战 | 📋 |

## 6. 快速开始

```bash
# 0) 环境要求:Node 18.18+(推荐 20+),PostgreSQL 14+(或 Docker)

# 1) 安装依赖
npm install

# 2) 准备数据库:二选一
#    a. Docker(推荐):
docker compose up -d        # 启动 postgres:16-alpine(端口 5432,用户/密码/库均为 fitplate)
#    b. 自备 Postgres:修改 .env 中 DATABASE_URL 即可

# 3) 配置环境变量
cp .env.example .env        # 按需修改;NEXTAUTH_SECRET 生产环境务必替换
#    可选项:AI_API_KEY(教练建议增强)、PEXELS_API_KEY(真实图片)、TAVILY_API_KEY(真实联网检索)
#    均未配置时自动降级:规则引擎提示 / 本地 SVG 占位图 / 内置可信来源库 —— 全功能仍可离线使用

# 4) 建表 + 种子数据
npm run db:push
npm run db:seed             # 创建演示账号与 30 天完整计划

# 5) 启动
npm run dev                 # http://localhost:3000
# 演示账号:demo@fitplate.app / fitplate123
```

生产部署:`npm run build && npm start`(需要环境变量中的 DATABASE_URL / NEXTAUTH_URL / NEXTAUTH_SECRET)。

> 🚀 **部署到服务器**:国内阿里云 ECS + Docker 的完整手把手指南见 [docs/DEPLOY-ALIYUN.md](docs/DEPLOY-ALIYUN.md)(含镜像加速、备案/HTTPS、备份与排错);通用路线(Vercel / Docker / 裸机)见 [docs/DEPLOY.md](docs/DEPLOY.md)。

## 7. 目录结构

```
src/
├── app/                    # Next.js App Router
│   ├── (页面) login/ onboarding/ today/ plan/ meal/[date]/[slot]/ shopping/ sources/
│   └── api/                # register/ profile/ plan/ meals/ checkin/ shopping-list/
│                           # export/csv/ img/ search/ ai/tip/ auth/[...nextauth]
├── components/             # UI 基础组件 + 功能组件(见 §4)
├── lib/
│   ├── calc.ts             # BMR/TDEE/缺口/宏量营养素(纯函数)
│   ├── workout-engine.ts   # 训练日历引擎(周模板 × 器械/水平过滤 × 强度缩放)
│   ├── meal-engine.ts      # 食谱引擎(过敏/忌口/预算/时长过滤 + 份量缩放 + 购物清单)
│   ├── exercises.ts        # 45+ 动作库(器械/等级/组次/要点)
│   ├── recipes.ts          # 29 道食谱(食材克数/营养/步骤/替代食材)
│   ├── plan-service.ts     # 生成 ↔ 数据库编排(重生成保留打卡进度)
│   ├── search.ts           # 可信来源检索:白名单/去重/缓存/降级
│   ├── ai.ts               # 服务端 AI 调用(zod 校验 JSON,失败回退规则引擎)
│   ├── images.ts           # SVG 占位图 + Pexels(可选)
│   ├── auth.ts / api.ts / validation.ts / csv.ts / db.ts / utils.ts / constants.ts
└── middleware.ts           # 登录保护
prisma/ schema.prisma · seed.ts
tests/                      # vitest:calc / workout-engine / meal-engine / search / csv-utils
```

## 8. 测试

```bash
npm test        # vitest run,45 个用例
npm run test:watch
```

覆盖:BMR/Katch-McArdle、缺口钳制与安全下限、孕期/未成年/BMI 偏低等安全分支、宏量营养素能量一致性;训练日历的周期长度/训练天数/器械过滤/强度缩放/确定性;食谱的过敏原/忌口/素食/预算/时长过滤与热量对齐、份量缩放、购物清单合并;来源白名单(相似域名攻击)/去重/缓存/可注入 fetcher;CSV 转义与 BOM。

## 9. 联网资料与版权

- **来源白名单**:who.int、acsm.org、cdc.gov、nih.gov、nutrition.org、efsa.europa.eu、nhs.uk、usda.gov、cnsoc.org、nhc.gov.cn。检索结果按规范化 URL 去重、缓存 6 小时,页面展示**标题、链接、机构、访问日期**。
- 配置 `TAVILY_API_KEY` 后进行真实联网检索(仍限定白名单域名);未配置时使用内置知识库。
- **图片**:默认使用本地生成的 SVG 占位图(无版权问题);配置 `PEXELS_API_KEY` 后返回 Pexels 可商用照片。Pexels 许可允许商用但建议署名,可在「参考来源」或页面署名处标注摄影师;本应用在图片服务层保留 `seed/query` 以便溯源。所有引用内容版权归原作者所有。
- 搜索结果仅供学习参考,**不构成医疗建议**;涉及疾病、孕期、未成年人或饮食障碍时,应用会在界面与导出文件中提示咨询专业人士。

## 10. 声明

- 所有生成内容(训练、食谱)均允许编辑、替换、调份量与重新生成,不强制接受自动建议。
- 打卡数据仅保存在你自己的数据库中;本应用不提供医疗诊断。
