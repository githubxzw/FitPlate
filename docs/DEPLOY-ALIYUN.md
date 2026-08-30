# FitPlate 阿里云部署指南(ECS + Docker 完整版)

> 目标架构:用户 →(安全组 80/443)→ **Nginx(宿主机,HTTPS)** → `127.0.0.1:3000`(**FitPlate 容器**)→ **PostgreSQL 容器**(仅内部网络,不暴露公网)
>
> 前提:一台阿里云 ECS(推荐 **2核4G** 起,系统 Ubuntu 22.04 或 Alibaba Cloud Linux 3),已安装 Docker;有一个域名(强烈建议,见 §6 备案说明)。

---

## 1. ECS 初始准备

### 1.1 配置安全组(只放行 22/80/443)

阿里云控制台 → **云服务器 ECS → 实例 → 你的实例 → 安全组 → 配置规则 → 入方向**:

| 协议 | 端口 | 授权对象 | 说明 |
|---|---|---|---|
| TCP | 22 | 你的常用 IP(不要 0.0.0.0/0 更安全) | SSH |
| TCP | 80 | 0.0.0.0/0 | HTTP(跳转 HTTPS) |
| TCP | 443 | 0.0.0.0/0 | HTTPS |

> ⚠️ **不要**放行 3000(应用)和 5432(Postgres)。应用只监听 `127.0.0.1:3000`,数据库不出容器网络。

### 1.2 SSH 登录并配置 Swap(2G 内存机器必做)

`next build` 峰值内存约 1.5G,小内存机器建议加 2G swap(或改用 §7 的本地构建):

```bash
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
free -h   # 确认 Swap 生效
```

## 2. 安装 Docker 并配置镜像加速(关键步骤)

大陆网络的 ECS 直连 Docker Hub 会超时,**必须配置镜像加速器**:

```bash
# Ubuntu 22.04 / Alibaba Cloud Linux 3 均可用官方脚本安装
curl -fsSL https://get.docker.com | sudo bash
sudo systemctl enable --now docker
docker compose version   # 确认 v2.x(v23+ 自带;老版本需另装 docker-compose-plugin)
```

配置加速器(阿里云容器镜像服务个人版会为每个账号分配专属地址:
控制台搜「容器镜像服务 → 镜像加速器」即可看到你的 `https://<你的ID>.mirror.aliyuncs.com`):

```bash
sudo mkdir -p /etc/docker
sudo tee /etc/docker/daemon.json >/dev/null <<'EOF'
{
  "registry-mirrors": [
    "https://<你的ID>.mirror.aliyuncs.com",
    "https://docker.m.daocloud.io"
  ]
}
EOF
sudo systemctl daemon-reload && sudo systemctl restart docker

# 验证能拉取镜像
docker pull postgres:16-alpine
```

## 3. 上传代码到服务器

方式 A(推荐):把项目推到 Git 仓库(云效 Codeup / Gitee / GitHub 私有仓库),然后:

```bash
sudo mkdir -p /opt/fitplate && sudo chown $USER /opt/fitplate
git clone <你的仓库地址> /opt/fitplate && cd /opt/fitplate
```

方式 B:本地直接同步(排除依赖目录):

```bash
rsync -avz --exclude node_modules --exclude .next --exclude .git \
  ./ user@<ECS公网IP>:/opt/fitplate/
```

## 4. 配置环境变量

```bash
cd /opt/fitplate
cp .env.example .env
vim .env
```

| 变量 | 必填 | 生产值 |
|---|---|---|
| `NEXTAUTH_URL` | ✅ | `https://fit.example.com`(有域名)/ `http://<ECS公网IP>:3000`(**仅临时测试**,IP 方式必须放行 3000 端口于安全组) |
| `NEXTAUTH_SECRET` | ✅ | 全新随机值:`openssl rand -base64 32` |
| `POSTGRES_PASSWORD` | ✅ | 强密码(compose 用它初始化数据库) |
| `TZ` | 建议 | `Asia/Shanghai` |
| `AI_API_KEY` / `PEXELS_API_KEY` / `TAVILY_API_KEY` | 可选 | 不配则自动降级,功能完整 |
| `SEED_ON_START` | 可选 | 首次启动想自动创建演示账号设 `1`(密码公开,正式使用务必改回 0 并自己注册账号) |
| `NPM_REGISTRY` | 建议 | `https://registry.npmmirror.com`(加速镜像构建) |
| `PRISMA_ENGINES_MIRROR` | 建议 | `https://registry.npmmirror.com/-/binary/prisma` |
| `NODE_IMAGE` | 可选 | `docker.m.daocloud.io/library/node:20-alpine`(加速器不可用时的兜底) |

## 5. 构建并启动

```bash
cd /opt/fitplate
docker compose -f docker-compose.prod.yml up -d --build

# 观察构建与启动日志(应用会先自动执行 prisma db push 建表)
docker compose -f docker-compose.prod.yml logs -f app
```

看到 `▲ Next.js ... Ready` 即启动成功,`Ctrl+C` 退出日志。验证:

```bash
curl -I http://127.0.0.1:3000/login        # 期望 HTTP/1.1 200
docker ps                                   # fitplate-app Up、fitplate-db Up (healthy)
```

需要演示数据时(二选一):

```bash
# 方式一:启动时自动(SEED_ON_START=1 已写入 .env)
docker compose -f docker-compose.prod.yml up -d
# 方式二:手动补一次
docker exec fitplate-app npm run db:seed
```

> 演示账号 `demo@fitplate.app / fitplate123` 仅用于体验;正式使用请注册自己的账号。

## 6. 域名、备案与 HTTPS

1. **备案(大陆地域必须)**:域名解析到中国大陆 ECS 并对外提供 80/443 服务,需先完成 **ICP 备案**(阿里云控制台 → [ICP 备案](https://beian.aliyun.com),约 1-2 周)。未备案的替代方案:购买**香港/海外地域** ECS,或临时用「IP:3000」访问(需在安全组放行 3000 并把 `NEXTAUTH_URL` 设为 `http://IP:3000`)。
2. **DNS 解析**:阿里云控制台 → 云解析 DNS → 添加 A 记录 `fit.example.com → <ECS 公网 IP>`。
3. **安装 Nginx 并反代**:

```bash
sudo apt install -y nginx   # Alibaba Cloud Linux: sudo yum install -y nginx

sudo tee /etc/nginx/sites-available/fitplate >/dev/null <<'NGINX'
server {
    listen 80;
    server_name fit.example.com;
    client_max_body_size 5m;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;   # HTTPS 下 NextAuth 必需
    }
}
NGINX

sudo ln -sf /etc/nginx/sites-available/fitplate /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

4. **HTTPS 证书**(二选一):

```bash
# 方式一:certbot 自动签发 + 续期(Let's Encrypt)
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d fit.example.com

# 方式二:阿里云免费证书(控制台 → 数字证书管理服务 → 免费证书 → 申请并下载 Nginx 版)
# 把 *.pem / *.key 上传到 /etc/nginx/certs/,在 server 块中增加:
#   listen 443 ssl;
#   ssl_certificate     /etc/nginx/certs/fit.example.com.pem;
#   ssl_certificate_key /etc/nginx/certs/fit.example.com.key;
```

验证:`https://fit.example.com` 能打开登录页,登录后进入「今日计划」。

## 7. 日常运维

```bash
# ---- 更新版本 ----
cd /opt/fitplate && git pull
NPM_REGISTRY=https://registry.npmmirror.com PRISMA_ENGINES_MIRROR=https://registry.npmmirror.com/-/binary/prisma \
  docker compose -f docker-compose.prod.yml up -d --build

# ---- 日志 / 状态 ----
docker compose -f docker-compose.prod.yml logs -f app
docker compose -f docker-compose.prod.yml ps

# ---- 备份(建议加 crontab 每日执行) ----
docker exec fitplate-db pg_dump -U fitplate fitplate | gzip > /opt/backups/fitplate-$(date +%F).sql.gz
# 恢复:
gunzip -c /opt/backups/fitplate-2026-08-30.sql.gz | docker exec -i fitplate-db psql -U fitplate -d fitplate

# ---- 小内存机器的替代构建方案:本地构建镜像后传到服务器 ----
# 本地:
#   docker build --build-arg NPM_REGISTRY=https://registry.npmmirror.com ... -t fitplate:latest .
#   docker save fitplate:latest | gzip > fitplate.tar.gz
#   scp fitplate.tar.gz user@<ECS>:~/
# 服务器:
#   docker load < fitplate.tar.gz
#   然后在 compose 文件里给 app 服务加 image: fitplate:latest 并去掉 build,up -d 即可
```

crontab 备份示例(每天 3 点,保留 14 天):

```cron
0 3 * * * docker exec fitplate-db pg_dump -U fitplate fitplate | gzip > /opt/backups/fitplate-$(date +\%F).sql.gz && find /opt/backups -name "*.sql.gz" -mtime +14 -delete
```

## 8. 常见问题排查

| 现象 | 原因与解决 |
|---|---|
| `docker pull` 一直超时 | 未配置镜像加速器,回到 §2 配置 `registry-mirrors` |
| 构建时 `npm ci` 很慢或失败 | 传 `NPM_REGISTRY=https://registry.npmmirror.com` 构建参数;若报 404(npmmirror 对刚发布的新版本有同步滞后),Dockerfile 会自动回退官方源重试,无需处理 |
| 构建时卡在 `prisma generate` 下载引擎 | 传 `PRISMA_ENGINES_MIRROR=https://registry.npmmirror.com/-/binary/prisma` |
| 容器构建/启动时被 OOM Kill | 加 swap(§1.2)或用本地构建 `docker save/load`(§7) |
| 访问域名显示 502 | 容器没起来:`docker compose -f docker-compose.prod.yml ps` + `logs app`;或 Nginx 指向的端口不对 |
| 登录跳回登录页 / 报 CSRF / UntrustedHost | `NEXTAUTH_URL` 与浏览器实际访问地址不一致(协议、域名、端口都要一致);HTTPS 反代必须带 `X-Forwarded-Proto` |
| 注册/登录报「数据库」错误 | 数据库没就绪:`docker compose ps` 看 db 是否 healthy;确认 `.env` 的 `POSTGRES_PASSWORD` 与首次初始化一致(改密码需删除 volume 重建) |
| 「今日计划」日期不对 | 服务器时区:确认 `.env` 中 `TZ=Asia/Shanghai`(compose 已注入) |
| 页面图片全是彩色占位图 | 这是默认降级行为;想要真实照片在 `.env` 配 `PEXELS_API_KEY` 后 `up -d` 重建 |

## 9. 上线安全清单

- [ ] `NEXTAUTH_SECRET` 为全新随机值,未使用示例值
- [ ] `POSTGRES_PASSWORD` 为强密码;5432 未在安全组放行
- [ ] 3000 端口未在安全组放行(仅 Nginx 对外)
- [ ] HTTPS 已启用,`NEXTAUTH_URL` 为 https 域名
- [ ] `SEED_ON_START=0`(或已删除演示账号)
- [ ] crontab 每日备份已配置并验证恢复过一次
- [ ] 域名已完成 ICP 备案(大陆地域)

---

需要多实例/负载均衡时:应用无状态(JWT 会话),共享同一个 PostgreSQL 即可水平扩展;`/api/search` 的缓存是进程内存,多实例各自缓存可接受,后续可换 Redis。完整通用指南见 [DEPLOY.md](DEPLOY.md)。
