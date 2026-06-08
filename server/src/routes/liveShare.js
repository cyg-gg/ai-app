import { Router } from 'express'
import { appendLiveMessage, createLiveShare, getLiveShare, listLiveMessages } from '../services/liveShare.js'
import { subscribe } from '../lib/liveShareEvents.js'

const router = Router()

router.post('/conversation', async (req, res, next) => {
  try {
    const { sessionId, title } = req.body
    if (!sessionId) return res.status(400).json({ error: 'sessionId 不能为空' })
    // 根据请求的 host 生成公网地址
    const host = req.get('host')
    const protocol = req.protocol
    const baseUrl = process.env.PUBLIC_BASE_URL || `${protocol}://${host}`
    const result = await createLiveShare({ sessionId, title, baseUrl })
    res.json(result)
  } catch (e) {
    next(e)
  }
})

router.get('/conversation/:roomId', async (req, res, next) => {
  try {
    const room = await getLiveShare(req.params.roomId)
    if (!room) return res.status(404).json({ error: '实时共享会话不存在' })
    res.json({ room, messages: await listLiveMessages(room.id) })
  } catch (e) {
    next(e)
  }
})

router.post('/conversation/:roomId/messages', async (req, res, next) => {
  try {
    const room = await getLiveShare(req.params.roomId)
    if (!room) return res.status(404).json({ error: '实时共享会话不存在' })
    const { content, senderName } = req.body
    if (!content?.trim()) return res.status(400).json({ error: '消息不能为空' })
    const message = await appendLiveMessage(room.id, { role: 'user', content, senderName })
    res.json({ success: true, message })
  } catch (e) {
    next(e)
  }
})

router.get('/stream/:roomId', async (req, res, next) => {
  try {
    const room = await getLiveShare(req.params.roomId)
    if (!room) return res.status(404).json({ error: '实时共享会话不存在' })

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*')

    // 发送初始状态
    const messages = await listLiveMessages(room.id)
    res.write(`data: ${JSON.stringify({ type: 'init', messages })}\n\n`)

    const ping = setInterval(() => {
      res.write(`data: ${JSON.stringify({ type: 'ping', time: Date.now() })}\n\n`)
    }, 15000)

    const unsubscribe = subscribe(room.id, (payload) => {
      try {
        res.write(`data: ${JSON.stringify(payload)}\n\n`)
      } catch (e) {
        clearInterval(ping)
        unsubscribe()
        res.end()
      }
    })

    req.on('close', () => {
      clearInterval(ping)
      unsubscribe()
      res.end()
    })
  } catch (e) {
    next(e)
  }
})

export default router
