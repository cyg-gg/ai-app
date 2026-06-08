import { Router } from 'express'
import { addMessage, createRoom, deleteRoom, getRoom, listMessages, listRooms, updateRoom } from '../services/groupChat.js'
import { subscribe } from '../lib/groupChatEvents.js'

const router = Router()

router.get('/rooms', async (req, res, next) => {
  try {
    res.json({ rooms: await listRooms() })
  } catch (e) {
    next(e)
  }
})

router.post('/rooms', async (req, res, next) => {
  try {
    const room = await createRoom(req.body || {})
    res.json(room)
  } catch (e) {
    next(e)
  }
})

router.patch('/rooms/:roomId', async (req, res, next) => {
  try {
    const room = await updateRoom(req.params.roomId, req.body || {})
    if (!room) return res.status(404).json({ error: '房间不存在' })
    res.json(room)
  } catch (e) {
    next(e)
  }
})

router.delete('/rooms/:roomId', async (req, res, next) => {
  try {
    const ok = await deleteRoom(req.params.roomId)
    if (!ok) return res.status(404).json({ error: '房间不存在' })
    res.json({ success: true })
  } catch (e) {
    next(e)
  }
})

router.get('/rooms/:roomId/messages', async (req, res, next) => {
  try {
    const room = await getRoom(req.params.roomId)
    if (!room) return res.status(404).json({ error: '房间不存在' })
    res.json({ room, messages: await listMessages(room.id) })
  } catch (e) {
    next(e)
  }
})

router.post('/rooms/:roomId/messages', async (req, res, next) => {
  try {
    const room = await getRoom(req.params.roomId)
    if (!room) return res.status(404).json({ error: '房间不存在' })
    const message = await addMessage(room.id, req.body || {})
    res.json({ success: true, message })
  } catch (e) {
    next(e)
  }
})

router.get('/stream/:roomId', async (req, res, next) => {
  try {
    const room = await getRoom(req.params.roomId)
    if (!room) return res.status(404).json({ error: '房间不存在' })

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders?.()

    const ping = setInterval(() => {
      res.write(`data: ${JSON.stringify({ type: 'ping', time: Date.now() })}\n\n`)
    }, 15000)

    const unsubscribe = subscribe(room.id, (payload) => {
      res.write(`data: ${JSON.stringify(payload)}\n\n`)
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
