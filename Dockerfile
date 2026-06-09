# Stage 1: 构建前端
FROM node:22-alpine AS frontend-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# Stage 2: 生产镜像
FROM node:22-alpine
WORKDIR /app

# 安装 PM2 进程管理器
RUN npm install -g pm2

# 复制后端依赖和代码
COPY server/package*.json ./server/
RUN cd server && npm ci --omit=dev
COPY server/ ./server/

# 复制前端构建产物
COPY --from=frontend-builder /app/client/dist ./client/dist

# 暴露端口
EXPOSE 3000

# 启动应用
CMD ["pm2-runtime", "src/app.js", "--name", "ai-app", "-i", "1"]
