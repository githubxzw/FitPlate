# FitPlate 部署指南

三种路线按省事程度排序,任选其一。生产环境三件套必改:`NEXTAUTH_URL`(公网地址)、`NEXTAUTH_SECRET`(`openssl rand -base64 32`)、数据库密码。

---

## 路线一:Vercel + 托管 Postgres(最省事,适合个人/小团队)

1. 准备一个托管 PostgreSQL(如 [Neon](https://neon.tech)、[Supabase](https://supabase.com)、阿里云 RDS),拿到连接串:
   `postgresql://user:pass@host/db?schema=public&sslmode=require`
2. 本地(或 CI)对生产库初始化表结构:

   ```bash
   DATABASE_URL="<生产库连接串>" npx prisma db push
   # 可选:写入演示数据(或到线上自行注册账号)
   # DATABASE_URL="<生产库>" npm run db:seed
   ```

3. 代码推到 GitHub,在 Vercel 导入仓库,配置环境变量:

   | 变量 | 值 |
   |---|---|
   | `DATABASE_URL` | 生产库连接串 |
   | `NEXTAUTH_URL` | `https://你的域名`(或 Vercel 预览域) |
   | `NEXTAUTH_SECRET` | `openssl rand -base64 32` 生成 |
   | `TZ` | `Asia/Shanghai` |
   | `AI_API_KEY` / `PEXELS_API_KEY` / `TAVILY_API_KEY` | 可选增强,不配则降级 |

4. 部署完成。Vercel 自带 HTTPS 与 CDN;应用是标准 Next.js App Router,无需额外配置。
   注意:Serverless 函数需能访问你的数据库(选同区域,如 Vercel 默认区 + Neon 美东区需对齐)。

## 路线二:Docker Compose 单机自托管(推荐,可复现)

适合一台 2C4G 以上的云服务器(Ubuntu/Debian),已装 Docker 与 Docker Compose v2。

```bash
# 1) 上传代码
git clone <你的仓库> /opt/fitplate && cd /opt/fitplate
#    (或本机 rsync -avz --exclude node_modules --exclude .next ./ user@server:/opt/fitplate)

# 2) 配置环境变量
cp .env.example .env
vim .env   # 必改:NEXTAUTH_URL=https://fit.example.com、NEXTAUTH_SECRET、POSTGRES_PASSWORD
           # 可选:AI_API_KEY / PEXELS_API_KEY / TAVILY_API_KEY;首次想自动建演示账号则 SEED_ON_START=1

# 3) 构建并启动(Postgres + 应用;国内网络可加 NODE_IMAGE=docker.m.daocloud.io/library/node:20-alpine)
docker compose -f docker-compose.prod.yml up -d --build

# 4) 查看日志 / 验证
docker compose -f docker-compose.prod.yml logs -f app
curl -I http://127.0.0.1:3000/login   # 期望 200
```

应用只监听 `127.0.0.1:3000`,用 Nginx 对外提供 80/443:

```nginx
server {
    listen 80;
    server_name fit.example.com;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;   # NextAuth 需要
    }
}
```

```bash
sudo certbot --nginx -d fit.example.com   # 免费证书自动续期
```

日常运维:

```bash
docker compose -f docker-compose.prod.yml up -d --build   # 更新版本
docker exec fitplate-db pg_dump -U fitplate fitplate > backup-$(date +%F).sql   # 备份
cat backup.sql | docker exec -i fitplate-db psql -U fitplate -d fitplate        # 恢复
```

## 路线三:裸机 Node + systemd(无 Docker 环境)

```bash
# 前置:Node 20+、PostgreSQL 14+(apt/brew 安装),已建库 fitplate
cd /opt/fitplate
npm ci
npm run build          # 1G 小内存机器易 OOM,见下方“小内存构建”
npm run setup          # prisma db push + seed(生产可跳过 seed)

sudo tee /etc/systemd/system/fitplate.service >/dev/null <<'UNIT'
[Unit]
Description=FitPlate
After=network.target postgresql.service

[Service]
WorkingDirectory=/opt/fitplate
EnvironmentFile=/opt/fitplate/.env
ExecStart=/usr/bin/npm start
Restart=always
User=www-data

[Install]
WantedBy=multi-user.target
UNIT

sudo systemctl enable --now fitplate
```

Nginx 反代同路线二。

---

## 附:常见问题

**小内存构建(1G VPS)**:`next build` 约需 1.5G 内存。三选一:
1. 本地/CI 构建后仅同步产物:`rsync -avz --delete .next node_modules public package.json next.config.mjs user@server:/opt/fitplate/`(注意操作系统架构一致,否则重装 `npm rebuild`);
2. 加交换分区 `fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile`;
3. 直接用路线二,在本地构建镜像、`docker save/load` 传到服务器。

**数据库迁移策略**:MVP 用 `prisma db push`(幂等,单实例够用)。多人协作/需要回滚时切换到迁移模式:
`npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > prisma/migrations/0_init/migration.sql`(补 `migration_lock.toml`),此后本地 `prisma migrate dev`、部署机 `npx prisma migrate deploy`(把 `docker-entrypoint.sh` 里的 `db push` 一并替换)。

**时区**:务必设置 `TZ=Asia/Shanghai`,“今日计划”按服务器本地自然日切分。

**安全清单**:
- [ ] `NEXTAUTH_SECRET` 为全新随机值,`NEXTAUTH_URL` 为 https 域名
- [ ] 数据库强密码;Postgres 不暴露公网(compose 中仅注释掉的 127.0.0.1 映射)
- [ ] 防火墙只放行 22/80/443;`SEED_ON_START=0`(演示账号密码是公开的)
- [ ] 配置 `pg_dump` 定时备份(cron 每日一份)
- [ ] 反代设置 `X-Forwarded-Proto https`(HTTPS 下 NextAuth cookie 需要)

**水平扩展**:应用无状态(session 存 JWT),可直接多实例 + 负载均衡;唯一前提是共享同一个 PostgreSQL。`/api/search` 的 6 小时缓存为进程内存,多实例下各自缓存(可接受,或后续换 Redis)。
