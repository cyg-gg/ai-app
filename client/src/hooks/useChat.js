import { useState, useCallback, useRef, useEffect } from 'react'
import { chatAPI } from '../api/chat'
import { liveShareAPI } from '../api/liveShare'
import { v4 as uuid } from 'uuid'

const SESSION_KEY = 'ai_session_id'

export function useChat() {
  const [messages,  setMessages]  = useState([])
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState(null)
  const [sessionId, setSessionId] = useState(
    () => window.localStorage.getItem(SESSION_KEY) || uuid()
  )
  const abortRef = useRef(false)
  const [liveRoomId, setLiveRoomId] = useState(null)

  useEffect(() => {
    localStorage.setItem(SESSION_KEY, sessionId)
  }, [sessionId])

  useEffect(() => {
    chatAPI.getHistory(sessionId)
      .then(({ messages: history }) => {
        if (history?.length) {
          setMessages(history.map(m => ({
            id:      uuid(),
            role:    m.role,
            content: m.content,
            ts:      Date.now(),
          })))
        }
      })
      .catch(() => {})
  }, [sessionId])

  const sendMessage = useCallback(async (text) => {
    if (!text.trim() || loading) return

    abortRef.current = false
    const userMsg = { id: uuid(), role: 'user', content: text, ts: Date.now() }
    const aiMsg   = { id: uuid(), role: 'assistant', content: '', ts: Date.now() }

    setMessages(prev => [...prev, userMsg, aiMsg])
    setLoading(true)
    setError(null)

    // 实时共享消息由后端 chatStream 自动发布，无需前端单独推送

    try {
      for await (const data of chatAPI.stream(text, sessionId, liveRoomId)) {
        if (abortRef.current) break
        if (data.error) throw new Error(data.error)
        if (data.done) break
        if (data.text) {
          setMessages(prev =>
            prev.map(m =>
              m.id === aiMsg.id
                ? { ...m, content: m.content + data.text }
                : m
            )
          )
        }
      }
    } catch (e) {
      setError(e.message)
      setMessages(prev =>
        prev.map(m =>
          m.id === aiMsg.id
            ? { ...m, content: `❌ ${e.message}`, isError: true }
            : m
        )
      )
    } finally {
      setLoading(false)
    }
  }, [loading, sessionId, liveRoomId])

  const abort = useCallback(() => {
    abortRef.current = true
    setLoading(false)
  }, [])

  const reset = useCallback(async () => {
    await chatAPI.clearSession(sessionId).catch(() => {})
    const newId = uuid()
    setSessionId(newId)
    setMessages([])
    setError(null)
    abortRef.current = false
  }, [sessionId])

  const regenerate = useCallback(async () => {
    const lastUser = [...messages].reverse().find(m => m.role === 'user')
    if (!lastUser) return
    setMessages(prev => {
      const idx = [...prev].reverse().findIndex(m => m.role === 'assistant')
      if (idx === -1) return prev
      const realIdx = prev.length - 1 - idx
      return prev.filter((_, i) => i !== realIdx)
    })
    await sendMessage(lastUser.content)
  }, [messages, sendMessage])

  return {
    messages,
    loading,
    error,
    sessionId,
    liveRoomId,
    setLiveRoomId,
    sendMessage,
    abort,
    reset,
    regenerate,
  }
}
