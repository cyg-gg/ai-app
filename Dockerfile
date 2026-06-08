# ============================================================
# Stage 1: 构建前端 (Vite + React)
# ============================================================
FROM node:22-alpine AS frontend-builder

WORKDIR /app/client

# 先复制依赖文件，利用 Docker 缓存层
COPY client/package*.json ./
RUN npm ci

# 复制前端源码并构建
COPY client/ ./
RUN npm run build

# ============================================================
# Stage 2: 生产镜像 (后端 + 前端构建产物)
# ============================================================
FROM node:22-alpine

WORKDIR /app

# 安装 PM2 进程管理器（容器内进程守护、崩溃自动重启）
RUN npm install -g pm2

# ---- 后端 ----
# 先复制依赖文件，利用 Docker 缓存
COPY server/package*.json ./server/
RUN cd server && npm ci --omit=dev --legacy-peer-deps

# 复制后端源码
COPY server/ ./server/

# ---- 前端构建产物 ----
COPY --from=frontend-builder /app/client/dist ./client/dist

# ---- 持久化数据目录（uploads / json 存储）----
RUN mkdir -p /app/server/data /app/server/uploads

EXPOSE 3000

WORKDIR /app/server

# pm2-runtime 以前台模式运行，满足容器生命周期要求
CMD ["pm2-runtime", "src/app.js", "--name", "ai-app"]
