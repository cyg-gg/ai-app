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

# 安装 PM2 进程管理器（容器内进程守护、自动重启）
RUN npm install -g pm2

# ---- 后端 ----

# 先复制依赖文件
COPY server/package*.json ./server/
RUN cd server && npm ci --omit=dev

# 复制后端源码
COPY server/ ./server/

# ---- 前端构建产物 ----
COPY --from=frontend-builder /app/client/dist ./client/dist

# ---- 数据目录（JSON 文件存储）----
RUN mkdir -p /app/server/data

EXPOSE 3000

WORKDIR /app/server

# 使用 PM2 运行，容器退出时自动停止
# --no-daemon 确保 PM2 在前台运行（容器要求）
CMD ["pm2-runtime", "src/app.js", "--name", "ai-app", "-i", "1"]