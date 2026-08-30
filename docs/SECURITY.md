# FitPlate 安全设计与防攻击方案

> 适用:部署在公网(阿里云 ECS)对外提供服务的形态。
> 结论先行:当前服务一旦开放 80/443,**任何人都能访问并注册**——代码层没有注册门槛、没有限流,且存在两个无需登录的接口。本文按优先级给出分层防护设计。

---

## 一、现状评估

### 已具备的防护(无需重做)
- 密码使用 scrypt + 随机盐哈希(`src/lib/password.ts`),不存明文
- 会话为服务端签名的 JWT Cookie(NextAuth,httpOnly + HTTPS 下 Secure)
- 数据库全部经 Prisma 参数化查询,无 SQL 注入面
- 页面由 React 转义渲染,无 `dangerouslySetInnerHTML` 用户输入(主题脚本为静态内容)
- API 路由统一 `requireUserId` 鉴权(除下述例外),zod 严格校验所有输入
- 部署层建议的安全组只开放 22/80/443,数据库不出容器网络

### 确认的缺口(按严重度)
| # | 缺口 | 影响 |
|---|---|---|
| G1 | 注册完全开放:无验证码、无邮箱验证、无限流 | 机器人批量注册灌库、占用资源 |
| G2 | 登录无限流 | 针对单账号暴力破解 / 撞库 |
| G3 | `/api/search`、`/api/img` **无需登录** | 被刷 Tavily / Pexels 配额,产生费用 |
| G4 | 生成/重生成接口无频控 | 恶意用户反复 `scope=all` 重新生成,写库 + 耗 CPU |
| G5 | SVG 占位图 `emoji` 参数未转义(label 已转义) | 低危注入隐患(已修复 ✅) |
| G6 | 无安全响应头(CSP/HSTS 等) | 点击劫持、嗅探类低危风险 |
| G7 | 无登录失败锁定、无审计日志 | 异常行为不可见 |

---

## 二、分层防护设计

### P0 应用内改造(代码层,单机部署即可生效,建议立即实施)

**1. 接口限流(解决 G2/G3/G4)**
新增 `src/lib/rate-limit.ts`:内存滑动窗口计数器(单实例部署足够;多实例时换 Redis),统一 429 响应。

| 接口 | 维度 | 限额 |
|---|---|---|
| `POST /api/auth/callback/credentials`(登录) | IP + 邮箱 | 失败 5 次 / 15 分钟 |
| `POST /api/register` | IP | 3 次 / 小时 |
| `POST /api/plan`、`/api/meals`(scope=all) | 用户 | 6 次 / 小时 |
| `POST /api/plan`、`/api/meals`(scope=day/slot) | 用户 | 60 次 / 天 |
| `GET /api/search` | 用户(并补 `requireUserId`) | 20 次 / 小时 |
| `GET /api/img` | IP(带缓存,成本低) | 120 次 / 分钟 |
| `GET /api/ai/tip` | 用户 | 30 次 / 天 |

**2. 注册门槛(解决 G1,三选一,按运营形态选)**
| 方案 | 成本 | 适用 |
|---|---|---|
| **邀请码**:`INVITE_CODE` 环境变量,注册时必填 | 最低(半小时) | 朋友/家人/内测,最推荐首选 |
| **注册开关**:`REGISTRATION_ENABLED=false` 一键关闭 | 极低 | 出事时止血 + 小圈子固定名单 |
| **验证码**:阿里云验证码 / Cloudflare Turnstile(免费) | 中(接 SDK) | 完全公开运营 |
| 邮箱验证码(阿里云邮件推送) | 中高 | 正式产品化后 |

建议组合:先「邀请码 + 开关」;公开运营再上验证码与邮箱验证。

**3. 登录失败锁定(解决 G2 补充)**:同账号连续失败 10 次,锁定 30 分钟(内存计数即可),锁定期间一律返回通用错误「邮箱或密码不正确」(避免账号枚举)。

**4. 补齐鉴权与转义(解决 G3/G5)**
- `/api/search`、`/api/img` 增加 `requireUserId`
- SVG `emoji` 参数与 label 同样转义(✅ 本次已修复)

**5. 安全响应头(解决 G6)**,`next.config.mjs` 统一注入:
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Content-Security-Policy: default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self'
Strict-Transport-Security(建议在 Nginx 层): max-age=31536000; includeSubDomains
```

**6. 审计日志(解决 G7)**:登录成功/失败、注册、重生成、导出等关键动作写结构化日志(时间/IP/用户/动作),docker logs 已可收集;后续可接阿里云 SLS。

### P1 部署层(阿里云侧,不改代码)

1. **前置 CDN/WAF**:公开运营后建议阿里云 DCDN + WAF 基础版(防 DDoS/CC、IP 黑名单、Bot 识别);预算有限可先用 Cloudflare 免费版(注意国内回源速度)。
2. **安全组**:仅 80/443 + 22(22 限制源 IP);严禁放行 3000/5432。
3. **SSH 加固**:密钥登录、禁用密码、`fail2ban` 自动封爆破 IP。
4. **HTTPS + HSTS**:certbot 自动续期;Nginx 加 HSTS 头。
5. **监控告警**:云监控对 CPU/公网流量设阈值告警(被刷时最先异动的是流量);Nginx access log 保留 30 天。
6. **备份**:已有每日 `pg_dump`;再加一份同步到 OSS 异地存储。

### P2 产品层(公开运营后)

- 每用户资源配额:每日生成次数、可保留的计划周期数
- 邮箱验证(阿里云邮件推送,成本低)
- 最小管理后台:封禁用户、查看登录/生成异常(复用现有 Next.js 加 `/admin` 路由组)
- 依赖安全:开启 GitHub Dependabot,定期 `npm audit`

## 三、应急响应预案

| 场景 | 动作 |
|---|---|
| 遭遇批量注册 | `.env` 设 `REGISTRATION_ENABLED=false` → `up -d` 重启;清理垃圾账号(管理后台或 SQL) |
| 接口被刷 / CC | 安全组/WAF 封 IP 段;收紧对应限流阈值 |
| 登录爆破 | 依赖 P0 的锁定 + 限流;必要时 WAF 封源 |
| AI/图片 key 疑似泄露 | 立即在服务商后台吊销换新(key 只存在服务器 `.env`,GitHub 无泄露风险) |
| 数据库异常 | 停止写入,用最近备份恢复(pg_dump 每日一份 + OSS 异地) |

## 四、实施清单

- [x] SVG emoji 转义修复(G5,已完成)
- [ ] 限流工具 + 各接口限额(G2/G3/G4)
- [ ] 邀请码 + 注册开关(G1)
- [ ] 登录失败锁定 + 审计日志(G2/G7)
- [ ] `/api/search`、`/api/img` 补鉴权(G3)
- [ ] 安全响应头(G6)
- [ ] 阿里云:WAF/监控/fail2ban/备份上 OSS(P1)

> P0 全部实施约半天工作量;完成后该应用的安全水位对「个人/小圈子服务」绰绰有余,公开运营前再补 P1 的 WAF 与验证码即可。
