import { v4 as uuid } from 'uuid'
import { readJsonFile, writeJsonFile } from '../lib/jsonStore.js'
import { memoryStore } from '../memory/store.js'
import { publish } from '../lib/liveShareEvents.js'

const FILE = 'live-shares.json'
const MESSAGE_FILE = 'live-share-messages.json'

async function loadRooms() {
  return readJsonFile(FILE, [])
}
async function saveRooms(rooms) {
  return writeJsonFile(FILE, rooms)
}
async function loadMessages() {
  return readJsonFile(MESSAGE_FILE, [])
}
async function saveMessages(messages) {
  return writeJsonFile(MESSAGE_FILE, messages)
}

export async function createLiveShare({ sessionId, title, baseUrl }) {
  const messages = await memoryStore.getMessages(sessionId)
  
  // 如果会话不存在或没有消息，允许创建空房间
  const hasMessages = messages?.length > 0

  const roomId = uuid().replace(/-/g, '').slice(0, 10)
  const rooms = await loadRooms()
  const room = {
    id: roomId,
    sessionId,
    title: title || '实时共享会话',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  rooms.push(room)
  await saveRooms(rooms)

  // 只有当有消息时才初始化历史消息
  if (hasMessages) {
    const initialMessages = messages.map(m => ({
      id: uuid(),
      roomId,
      role: m.role || (m._getType?.() === 'human' ? 'user' : 'assistant'),
      content: m.content,
      ts: m.ts || Date.now(),
      sources: m.sources,
    }))
    const allMessages = await loadMessages()
    allMessages.push(...initialMessages)
    await saveMessages(allMessages)
  }

  return {
    roomId,
    liveUrl: `${baseUrl}/live/${roomId}`,
  }
}

export async function getLiveShare(roomId) {
  const rooms = await loadRooms()
  return rooms.find(r => r.id === roomId) || null
}

export async function listLiveMessages(roomId) {
  const messages = await loadMessages()
  return messages.filter(m => m.roomId === roomId).sort((a, b) => a.ts - b.ts)
}

export async function appendLiveMessage(roomId, { role, content, senderName, sources }) {
  const msg = {
    id: uuid(),
    roomId,
    role: role || 'user',
    content,
    senderName: senderName || '访客',
    ts: Date.now(),
    sources,
  }
  const messages = await loadMessages()
  messages.push(msg)
  await saveMessages(messages)
  publish(roomId, { type: 'message', message: msg })
  return msg
}
