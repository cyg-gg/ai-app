import { Router }    from 'express'
import { v4 as uuid } from 'uuid'
import { chat, chatStream } from '../chains/chat.js'
import { memoryStore }      from '../memory/store.js'
import { chatRateLimit }    from '../middleware/rateLimit.js'

const router = Router()

router.post('/', chatRateLimit, async (req, res, next) => {
  try {
    const { message, sessionId = uuid(), liveRoomId = null } = req.body
    if (!message?.trim()) {
      return res.status(400).json({ error: '消息不能为空' })
    }

    const answer = await chat(sessionId, message, liveRoomId)
    
    if (liveRoomId) {
      await publish(liveRoomId, {
        type: 'message',
        message: {
          id: uuid(),
          roomId: liveRoomId,
          role: 'user',
          content: message,
          ts: Date.now(),
        },
      })
      await publish(liveRoomId, {
        type: 'message',
        message: {
          id: uuid(),
          roomId: liveRoomId,
          role: 'assistant',
          content: answer,
          ts: Date.now(),
          done: true,
        },
      })
    }
    
    res.json({ answer, sessionId })
  } catch (e) {
    next(e)
  }
})

router.post('/stream', chatRateLimit, async (req, res, next) => {
  try {
    const { message, sessionId = uuid(), liveRoomId = null } = req.body
    if (!message?.trim()) {
      return res.status(400).json({ error: '消息不能为空' })
    }

    res.setHeader('Content-Type',  'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection',    'keep-alive')
    res.setHeader('X-Session-Id',  sessionId)
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*')
    res.setHeader('Access-Control-Allow-Credentials', 'true')

    // 消息发布由 chatStream 内部处理，避免重复发布
    const { stream, onChunk, onComplete } = await chatStream(sessionId, message, liveRoomId)

    let fullText = ''

    for await (const chunk of stream) {
      if (chunk) {
        fullText += chunk
        if (onChunk) await onChunk(chunk, fullText)
        res.write(`data: ${JSON.stringify({ text: chunk, sessionId, liveRoomId })}\n\n`)
      }
    }

    await onComplete(fullText)
    res.write(`data: ${JSON.stringify({ done: true, sessionId })}\n\n`)
    res.end()
  } catch (e) {
    console.error('流式对话错误:', e)
    res.write(`data: ${JSON.stringify({ error: e.message })}\n\n`)
    res.write('data: [DONE]\n\n')
    res.end()
  }
})

router.get('/history/:sessionId', async (req, res, next) => {
  try {
    const messages = await memoryStore.getMessages(req.params.sessionId)
    res.json({
      messages: messages.map(m => ({
        role:    m._getType() === 'human' ? 'user' : 'assistant',
        content: m.content,
      }))
    })
  } catch (e) {
    next(e)
  }
})

router.delete('/session/:sessionId', async (req, res, next) => {
  try {
    await memoryStore.clearSession(req.params.sessionId)
    res.json({ success: true })
  } catch (e) {
    next(e)
  }
})

router.get('/sessions', (req, res) => {
  res.json({ sessions: memoryStore.listSessions() })
})

export default router
