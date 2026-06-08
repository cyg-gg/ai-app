import { useCallback, useEffect, useState } from 'react'
import { liveShareAPI } from '../api/liveShare'

export function useLiveShare(roomId) {
  const [room, setRoom] = useState(null)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [connected, setConnected] = useState(false)

  const load = useCallback(async (id) => {
    const data = await liveShareAPI.get(id)
    setRoom(data.room)
    setMessages(data.messages || [])
    return data
  }, [])

  useEffect(() => {
    if (!roomId) return
    let source
    let timer
    let alive = true

    const poll = () => {
      timer = setInterval(() => load(roomId).catch(() => {}), 3000)
    }

    ;(async () => {
      try {
        await load(roomId)
        source = new EventSource(`${(import.meta.env.VITE_API_URL || '')}/api/live-share/stream/${roomId}`)
        source.onopen = () => { if (alive) setConnected(true) }
        source.onmessage = (evt) => {
          try {
            const data = JSON.parse(evt.data)
            // 处理 init 消息（发送初始状态）
            if (data.type === 'init' && data.messages) {
              setMessages(data.messages)
              return
            }
            // 处理普通消息
            if (data.type === 'message' && data.message) {
              const msg = data.message
              if (msg.streaming) {
                setMessages(prev => {
                  const last = prev[prev.length - 1]
                  if (last && last.role === 'assistant') {
                    const next = [...prev]
                    next[next.length - 1] = { ...last, content: msg.content, ts: msg.ts, streaming: true }
                    return next
                  }
                  return [...prev, { id: `${msg.ts}-stream`, role: 'assistant', content: msg.content, ts: msg.ts, streaming: true }]
                })
              } else if (msg.done) {
                setMessages(prev => {
                  const last = prev[prev.length - 1]
                  if (last && last.role === 'assistant') {
                    const next = [...prev]
                    next[next.length - 1] = { ...last, content: msg.content, ts: msg.ts, done: true }
                    return next
                  }
                  return [...prev, { id: `${msg.ts}-done`, role: 'assistant', content: msg.content, ts: msg.ts, done: true }]
                })
              } else {
                setMessages(prev => [...prev, { id: `${msg.ts}-${msg.role}`, ...msg }])
              }
            }
          } catch (e) {
            console.warn('解析 SSE 消息失败:', e.message)
          }
        }
        source.onerror = () => {
          if (!alive) return
          setConnected(false)
          source?.close()
          poll()
        }
      } catch (e) {
        setError(e.message)
      }
    })()

    return () => {
      alive = false
      source?.close()
      if (timer) clearInterval(timer)
    }
  }, [roomId, load])

  const sendMessage = useCallback(async (content, senderName = '我') => {
    if (!roomId || !content.trim()) return
    setLoading(true)
    try {
      await liveShareAPI.send(roomId, content, senderName)
      await load(roomId)
    } finally {
      setLoading(false)
    }
  }, [roomId, load])

  return { room, messages, loading, error, connected, sendMessage }
}
