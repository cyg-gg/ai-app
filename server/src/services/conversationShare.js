import { v4 as uuid } from 'uuid'
import { readJsonFile, writeJsonFile } from '../lib/jsonStore.js'
import { memoryStore } from '../memory/store.js'

const FILE = 'conversation-shares.json'

async function loadShares() {
  return readJsonFile(FILE, [])
}

async function saveShares(shares) {
  return writeJsonFile(FILE, shares)
}

function makeToken() {
  return uuid().replace(/-/g, '').slice(0, 10)
}

export async function createConversationShare({ sessionId, title, messages: providedMessages }) {
  const sourceMessages = Array.isArray(providedMessages) && providedMessages.length
    ? providedMessages
    : await memoryStore.getMessages(sessionId)

  if (!sourceMessages?.length) {
    const err = new Error('会话不存在或没有消息')
    err.statusCode = 404
    throw err
  }

  const payload = {
    sessionId,
    title: title || '未命名会话',
    messages: sourceMessages.map(m => {
      if (m?.role) {
        return {
          role: m.role,
          content: m.content,
          ts: m.ts || Date.now(),
          sources: m.sources,
        }
      }
      return {
        role: m._getType() === 'human' ? 'user' : 'assistant',
        content: m.content,
      }
    }),
  }

  const shares = await loadShares()
  const token = makeToken()
  const record = {
    id: uuid(),
    token,
    title: payload.title,
    payload,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    expiresAt: null,
    isDeleted: false,
  }
  shares.push(record)
  await saveShares(shares)

  return {
    token,
    shareUrl: `${process.env.PUBLIC_BASE_URL || ''}/share/${token}`,
  }
}

export async function getConversationShare(token) {
  const shares = await loadShares()
  const record = shares.find(item => item.token === token)
  if (!record || record.isDeleted) {
    const err = new Error('分享不存在')
    err.statusCode = 404
    throw err
  }
  if (record.expiresAt && new Date(record.expiresAt) < new Date()) {
    const err = new Error('分享已过期')
    err.statusCode = 410
    throw err
  }
  return record
}

export async function deleteConversationShare(token) {
  const shares = await loadShares()
  const idx = shares.findIndex(item => item.token === token)
  if (idx === -1) return false
  shares[idx].isDeleted = true
  shares[idx].updatedAt = new Date().toISOString()
  await saveShares(shares)
  return true
}
