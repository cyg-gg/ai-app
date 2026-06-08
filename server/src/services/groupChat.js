import { v4 as uuid } from 'uuid'
import { readJsonFile, writeJsonFile } from '../lib/jsonStore.js'
import { publish } from '../lib/groupChatEvents.js'
import { getFastModel } from '../models/llm.js'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { StringOutputParser } from '@langchain/core/output_parsers'

const ROOMS_FILE = 'group-chat-rooms.json'
const MESSAGES_FILE = 'group-chat-messages.json'

const AI_SENDER_ID = 'ai-bot'
const AI_SENDER_NAME = 'AI'

const AI_PROMPT = ChatPromptTemplate.fromMessages([
  ['system', `你是一个群聊中的 AI 助手，正在参与多人聊天。请根据聊天上下文自然回复用户的问题。
回复要求：
- 简洁自然，像朋友一样聊天
- 不要使用列表或 markdown 格式
- 回复不要太长，控制在 200 字以内
- 上下文中的消息格式：用户名：消息内容`],
  ['human', '聊天上下文：\n{context}\n\n用户 "{senderName}" 对你说：{input}'],
])

async function loadRooms() {
  return readJsonFile(ROOMS_FILE, [])
}
async function saveRooms(rooms) {
  return writeJsonFile(ROOMS_FILE, rooms)
}
async function loadMessages() {
  return readJsonFile(MESSAGES_FILE, [])
}
async function saveMessages(messages) {
  return writeJsonFile(MESSAGES_FILE, messages)
}

export async function createRoom({ name, creatorId = 'system' }) {
  const rooms = await loadRooms()
  const room = { id: uuid(), token: uuid().replace(/-/g, '').slice(0, 10), name: name || '未命名房间', creatorId, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
  rooms.push(room)
  await saveRooms(rooms)
  return room
}

export async function listRooms() {
  return loadRooms()
}

export async function getRoom(roomId) {
  const rooms = await loadRooms()
  return rooms.find(r => r.id === roomId || r.token === roomId) || null
}

export async function updateRoom(roomId, patch = {}) {
  const rooms = await loadRooms()
  const idx = rooms.findIndex(r => r.id === roomId || r.token === roomId)
  if (idx === -1) return null
  rooms[idx] = { ...rooms[idx], ...patch, updatedAt: new Date().toISOString() }
  await saveRooms(rooms)
  return rooms[idx]
}

export async function deleteRoom(roomId) {
  const rooms = await loadRooms()
  const idx = rooms.findIndex(r => r.id === roomId || r.token === roomId)
  if (idx === -1) return false
  const deleted = rooms[idx]
  rooms.splice(idx, 1)
  await saveRooms(rooms)
  const messages = await loadMessages()
  await saveMessages(messages.filter(m => m.roomId !== deleted.id))
  return true
}

export async function listMessages(roomId) {
  const messages = await loadMessages()
  return messages.filter(m => m.roomId === roomId).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
}

export async function addMessage(roomId, { senderId = 'guest', senderName = '匿名', content }) {
  if (!content?.trim()) throw new Error('消息不能为空')
  const message = { id: uuid(), roomId, senderId, senderName, content, createdAt: new Date().toISOString() }
  const messages = await loadMessages()
  messages.push(message)
  await saveMessages(messages)
  publish(roomId, { type: 'message', message })

  //  @AI 自动回复 ──
  console.log('[AI检测] 消息内容:', content, '正则匹配结果:', /@AI|@ai/.test(content))
  if (/@AI|@ai/.test(content)) {
    const cleanInput = content.replace(/@AI|@ai/g, '').trim()
    const input = cleanInput || '你好，请介绍一下你自己'
    console.log('[AI检测] 清理后的输入:', input)

    // 获取最近 10 条消息作为上下文
    const recentMessages = messages
      .filter(m => m.roomId === roomId)
      .slice(-10)
      .map(m => `${m.senderName}：${m.content}`)
      .join('\n')

    try {
      const model = getFastModel()
      const chain = AI_PROMPT.pipe(model).pipe(new StringOutputParser())
      const reply = await chain.invoke({
        context: recentMessages,
        senderName,
        input,
      })

      const aiMessage = {
        id: uuid(),
        roomId,
        senderId: AI_SENDER_ID,
        senderName: AI_SENDER_NAME,
        content: reply.trim(),
        createdAt: new Date().toISOString(),
      }
      messages.push(aiMessage)
      await saveMessages(messages)
      publish(roomId, { type: 'message', message: aiMessage })
    } catch (e) {
      console.error('[AI回复失败]', e.message)
      const errorMsg = {
        id: uuid(),
        roomId,
        senderId: AI_SENDER_ID,
        senderName: AI_SENDER_NAME,
        content: '🤖 抱歉，AI 暂时无法回复，请稍后再试。',
        createdAt: new Date().toISOString(),
      }
      messages.push(errorMsg)
      await saveMessages(messages)
      publish(roomId, { type: 'message', message: errorMsg })
    }
  }

  return message
}
