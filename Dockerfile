# FitPlate 生产镜像(多阶段构建)
# 国内网络(如阿里云 ECS)推荐:
#   docker build \
#     --build-arg NODE_IMAGE=docker.m.daocloud.io/library/node:20-alpine \
#     --build-arg NPM_REGISTRY=https://registry.npmmirror.com \
#     --build-arg PRISMA_ENGINES_MIRROR=https://registry.npmmirror.com/-/binary/prisma \
#     -t fitplate .

ARG NODE_IMAGE=node:20-alpine

# ---------- 依赖层 ----------
FROM ${NODE_IMAGE} AS deps
ARG NPM_REGISTRY=""
WORKDIR /app
RUN apk add --no-cache openssl
COPY package.json package-lock.json ./
# 使用国内镜像源加速;遇 npmmirror 同步滞后(新版本 404)时自动回退官方源重试
RUN set -eux; \
    if [ -n "$NPM_REGISTRY" ]; then npm config set registry "$NPM_REGISTRY"; fi; \
    npm ci --no-audit --no-fund || { \
      echo "[deps] ${NPM_REGISTRY:-default} 安装失败,回退 registry.npmjs.org 重试"; \
      npm config set registry https://registry.npmjs.org; \
      npm ci --no-audit --no-fund; \
    }

# ---------- 构建层 ----------
FROM ${NODE_IMAGE} AS builder
ARG NPM_REGISTRY=""
ARG PRISMA_ENGINES_MIRROR=""
ENV PRISMA_ENGINES_MIRROR=${PRISMA_ENGINES_MIRROR}
WORKDIR /app
RUN apk add --no-cache openssl
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# 构建阶段只需要生成 Prisma Client,不需要真实数据库连接
RUN npx prisma generate && npm run build

# ---------- 运行层 ----------
FROM ${NODE_IMAGE} AS runner
WORKDIR /app
RUN apk add --no-cache openssl
ENV NODE_ENV=production \
    TZ=Asia/Shanghai \
    NEXT_TELEMETRY_DISABLED=1
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
# seed.ts(prisma/seed.ts)引用 ../src/lib 源码,需一并带入
COPY --from=builder /app/src ./src
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.mjs ./next.config.mjs
# tsx 运行 seed 时解析 "@/..." 路径别名需要 tsconfig
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh
EXPOSE 3000
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["npm", "start"]
