import { Router } from 'express'
import { createConversationShare, getConversationShare, deleteConversationShare } from '../services/conversationShare.js'

const router = Router()

router.post('/conversation', async (req, res, next) => {
  try {
    const { sessionId, title, messages } = req.body
    if (!sessionId && (!Array.isArray(messages) || messages.length === 0)) {
      return res.status(400).json({ error: 'sessionId 或 messages 不能为空' })
    }

    const result = await createConversationShare({ sessionId, title, messages })
    res.json(result)
  } catch (e) {
    next(e)
  }
})

router.get('/conversation/:token', async (req, res, next) => {
  try {
    const record = await getConversationShare(req.params.token)
    res.json({
      token: record.token,
      title: record.title,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      expiresAt: record.expiresAt,
      payload: record.payload,
    })
  } catch (e) {
    next(e)
  }
})

router.delete('/conversation/:token', async (req, res, next) => {
  try {
    const ok = await deleteConversationShare(req.params.token)
    if (!ok) return res.status(404).json({ error: '分享不存在' })
    res.json({ success: true })
  } catch (e) {
    next(e)
  }
})

export default router
