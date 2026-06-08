import { useCallback, useEffect, useState, useRef } from 'react'

const BASE = import.meta.env.VITE_API_URL || ''

// 生成唯一的用户 ID（每次会话固定）
function getMySenderId() {
  let id = sessionStorage.getItem('group_chat_sender_id')
  if (!id) {
    id = 'user_' + Math.random().toString(36).slice(2, 10)
    sessionStorage.setItem('group_chat_sender_id', id)
  }
  return id
}

// 生成随机昵称
function getRandomNickname() {
  const adjectives = ['快乐的', '聪明的', '勇敢的', '温柔的', '神秘的', '活泼的', '安静的', '热情的']
  const nouns = ['小猫', '小狗', '小鸟', '小鱼', '小兔', '小熊', '小鹿', '小狐狸']
  return adjectives[Math.floor(Math.random() * adjectives.length)] + nouns[Math.floor(Math.random() * nouns.length)]
}

function getMySenderName() {
  let name = sessionStorage.getItem('group_chat_sender_name')
  if (!name) {
    name = getRandomNickname()
    sessionStorage.setItem('group_chat_sender_name', name)
  }
  return name
}

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    credentials: 'include',
    ...options,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || data.message || `请求失败 ${res.status}`)
  return data
}

export function useGroupChat(roomId) {
  const [room, setRoom] = useState(null)
  const [messages, setMessages] = useState([])
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [connected, setConnected] = useState(false)
  const mySenderId = useRef(getMySenderId())
  const mySenderName = useRef(getMySenderName())

  const loadRooms = useCallback(async () => {
    const data = await request('/api/group-chat/rooms')
    setRooms(data.rooms || [])
    return data.rooms || []
  }, [])

  const createRoom = useCallback(async (name) => {
    const room = await request('/api/group-chat/rooms', {
      method: 'POST',
      body: JSON.stringify({ name }),
    })
    const list = await loadRooms()
    setRoom(room)
    setMessages([])
    return { room, rooms: list }
  }, [loadRooms])

  const loadMessages = useCallback(async (id) => {
    if (!id) return
    const data = await request(`/api/group-chat/rooms/${id}/messages`)
    setRoom(data.room)
    setMessages(data.messages || [])
  }, [])

  const sendMessage = useCallback(async (content) => {
    if (!roomId || !content.trim()) return
    setLoading(true)
    try {
      await request(`/api/group-chat/rooms/${roomId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content, senderName: mySenderName.current, senderId: mySenderId.current }),
      })
    } finally {
      setLoading(false)
    }
  }, [roomId])

  useEffect(() => {
    loadRooms().catch(e => setError(e.message))
  }, [loadRooms])

  useEffect(() => {
    if (!roomId) return
    let source
    let timer
    let alive = true

    const startPolling = () => {
      timer = setInterval(() => {
        loadMessages(roomId).catch(() => {})
      }, 3000)
    }

    const connect = async () => {
      try {
        await loadMessages(roomId)
        source = new EventSource(`${BASE}/api/group-chat/stream/${roomId}`)
        source.onopen = () => { if (alive) setConnected(true) }
        source.onmessage = (evt) => {
          try {
            const data = JSON.parse(evt.data)
            if (data.type === 'message' && data.message) {
              setMessages(prev => [...prev, data.message])
            }
          } catch {}
        }
        source.onerror = () => {
          if (!alive) return
          setConnected(false)
          source?.close()
          startPolling()
        }
      } catch (e) {
        setError(e.message)
      }
    }

    connect()

    return () => {
      alive = false
      source?.close()
      if (timer) clearInterval(timer)
    }
  }, [roomId, loadMessages])

  return { room, rooms, messages, loading, error, connected, sendMessage, loadRooms, loadMessages, createRoom, mySenderId: mySenderId.current }
}
