import express     from 'express'
import path       from 'path'
import morgan      from 'morgan'
import { fileURLToPath } from 'url'
import { config }  from './config/index.js'
import httpProxy   from 'http-proxy'

// __dirname 兼容 ESM
const __filename = fileURLToPath(import.meta.url)
const __dirname  = path.dirname(__filename)

// 路由
import chatRouter  from './routes/chat.js'
import ragRouter   from './routes/rag.js'
import agentRouter from './routes/agent.js'
import statsRouter from './routes/stats.js'
import shareRouter from './routes/share.js'
import liveShareRouter from './routes/liveShare.js'
import groupChatRouter from './routes/groupChat.js'

// 中间件
import { authMiddleware } from './middleware/auth.js'
import { errorHandler }   from './middleware/error.js'

const app = express()

// ── 生产环境：直接服务前端构建产物 ──
if (config.nodeEnv === 'production') {
  const clientDist = path.resolve(__dirname, '../../client/dist')
  app.use(express.static(clientDist))
  console.log(`📦 生产模式：前端静态资源来自 ${clientDist}`)
}

// ─ 前端反向代理（开发环境将根路径转发到前端）──
const frontendProxy = httpProxy.createProxyServer({
  target: 'http://localhost:5173',
  changeOrigin: true,
  ws: true,
  proxyTimeout: 30000,
  timeout: 30000,
})

// 代理错误处理 - 防止后端崩溃
frontendProxy.on('error', (err, req, res) => {
  res.status(502).json({
    error: '前端服务未启动，请确保已运行 `cd client && npm run dev`',
  })
})

const allowedOrigins = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
  ...(process.env.ALLOWED_ORIGINS?.split(',').map(origin => origin.trim()).filter(Boolean) || []),
])

// ── 手动 CORS 处理（必须放最前面）──
app.use((req, res, next) => {
  const origin = req.headers.origin

  const isAllowed = !origin || 
    allowedOrigins.has(origin) || 
    (origin && (origin.includes('ngrok-free.dev') || origin.includes('ngrok.io')))

  if (isAllowed) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*')
    res.setHeader('Access-Control-Allow-Credentials', 'true')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Api-Key, X-Session-Id, X-Requested-With')
    res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Type')

    if (req.method === 'OPTIONS') {
      return res.status(204).end()
    }
  }

  next()
})

// ── 日志 ──
app.use(morgan(config.isDev ? 'dev' : 'combined'))

// ── Body 解析 ─
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// ── 健康检查 ──
app.get('/health', (req, res) => {
  res.json({
    status:  'ok',
    time:    new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    env:     config.nodeEnv,
  })
})

// ── 业务路由（API）──
app.use('/api/chat',  authMiddleware, chatRouter)
app.use('/api/rag',   authMiddleware, ragRouter)
app.use('/api/agent', authMiddleware, agentRouter)
app.use('/api/stats', authMiddleware, statsRouter)
app.use('/api/share',  authMiddleware, shareRouter)
app.use('/api/live-share', authMiddleware, liveShareRouter)
app.use('/api/group-chat', authMiddleware, groupChatRouter)

// ── 前端路由 ──
if (config.nodeEnv === 'production') {
  // 生产环境：SPA 回退到 index.html
  const clientDist = path.resolve(__dirname, '../../client/dist')
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/') || req.path === '/health') return next()
    res.sendFile(path.join(clientDist, 'index.html'))
  })
} else {
  // 开发环境：反向代理到 Vite 开发服务器
  app.get('/index.html', (req, res) => {
    frontendProxy.web(req, res)
  })

  app.use('/assets/', (req, res) => {
    frontendProxy.web(req, res)
  })

  app.use((req, res, next) => {
    if (req.path.startsWith('/api/') || req.path === '/health') {
      return next()
    }
    frontendProxy.web(req, res)
  })
}

// ── 404 ──
app.use((req, res) => {
  res.status(404).json({
    error: `路由 [${req.method}] ${req.path} 不存在`,
  })
})

// ── 全局错误处理 ──
app.use(errorHandler)

// ── 启动 ──
const server = app.listen(config.port, () => {
  console.log(`🚀 服务启动：http://localhost:${config.port}`)
  console.log(`📦 环境：${config.nodeEnv}`)
  console.log(`🔑 鉴权：${config.isDev ? '关闭（开发模式）' : '开启'}`)
})

// ── 优雅关闭 ──
function gracefulShutdown(signal) {
  console.log(`\n📴 收到 ${signal}，正在优雅关闭...`)
  server.close((err) => {
    if (err) { console.error('关闭出错:', err); process.exit(1) }
    console.log('✅ 服务已安全关闭')
    process.exit(0)
  })
  setTimeout(() => { console.error('⏰ 超时强制退出'); process.exit(1) }, 10000)
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT',  () => gracefulShutdown('SIGINT'))
process.on('uncaughtException',  (e) => {
  console.error('💥 未捕获异常:', e)
  gracefulShutdown('uncaughtException')
})
process.on('unhandledRejection', (e) => {
  console.error('💥 未处理 Promise:', e)
  gracefulShutdown('unhandledRejection')
})

export default app
