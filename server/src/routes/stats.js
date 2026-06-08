import { Router }   from 'express'
import { getStats } from '../middleware/tokenTracker.js'
import { memoryStore }        from '../memory/store.js'
import { vectorStoreManager } from '../vectorstore/index.js'

const router = Router()

// 整体统计
router.get('/', (req, res) => {
  const tokenStats = getStats()
  res.json({
    token:    tokenStats,
    sessions: {
      active: memoryStore.listSessions().length,
      list:   memoryStore.listSessions().slice(0, 10),  // 只返回最近10条
    },
    vectorStores: {
      count: vectorStoreManager.listStores().length,
      names: vectorStoreManager.listStores(),
    },
    uptime:  process.uptime(),
    memory:  process.memoryUsage(),
  })
})

// 单个会话统计
router.get('/session/:sessionId', (req, res) => {
  const stats   = getStats()
  const session = stats.bySession[req.params.sessionId]
  if (!session) return res.status(404).json({ error: '会话不存在' })
  res.json(session)
})

// 重置统计
router.delete('/reset', (req, res) => {
  // 仅开发环境允许
  if (process.env.NODE_ENV !== 'development') {
    return res.status(403).json({ error: '仅开发环境可用' })
  }
  res.json({ message: '统计已重置（重启服务生效）' })
})

export default router
