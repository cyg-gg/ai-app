import { ChatMessageHistory }     from '@langchain/community/stores/message/in_memory'
import { HumanMessage, AIMessage } from '@langchain/core/messages'

// 生产环境换 Redis，开发用内存
class SessionMemoryStore {
  constructor() {
    this.sessions = new Map()     // sessionId → ChatMessageHistory
    this.metadata = new Map()     // sessionId → { createdAt, lastActive, title }

    // 定时清理过期会话（30分钟无活动）
    setInterval(() => this.cleanup(), 5 * 60 * 1000)
  }

  getOrCreate(sessionId) {
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, new ChatMessageHistory())
      this.metadata.set(sessionId, {
        createdAt:  Date.now(),
        lastActive: Date.now(),
        title:      '新对话',
        messageCount: 0,
      })
    }
    return this.sessions.get(sessionId)
  }

  async addMessage(sessionId, role, content) {
    const history = this.getOrCreate(sessionId)
    const meta    = this.metadata.get(sessionId)

    if (role === 'human') {
      await history.addMessage(new HumanMessage(content))
      // 第一条消息作为标题
      if (meta.messageCount === 0) {
        meta.title = content.slice(0, 30) + (content.length > 30 ? '...' : '')
      }
    } else {
      await history.addMessage(new AIMessage(content))
    }

    meta.lastActive = Date.now()
    meta.messageCount++
  }

  async getMessages(sessionId) {
    const history = this.getOrCreate(sessionId)
    return history.getMessages()
  }

  async clearSession(sessionId) {
    this.sessions.delete(sessionId)
    this.metadata.delete(sessionId)
  }

  // 获取所有会话列表
  listSessions() {
    return Array.from(this.metadata.entries()).map(([id, meta]) => ({
      id,
      ...meta,
    })).sort((a, b) => b.lastActive - a.lastActive)
  }

  // 清理 30 分钟未活动的会话
  cleanup() {
    const threshold = Date.now() - 30 * 60 * 1000
    for (const [id, meta] of this.metadata.entries()) {
      if (meta.lastActive < threshold) {
        this.sessions.delete(id)
        this.metadata.delete(id)
      }
    }
  }
}

// 单例导出
export const memoryStore = new SessionMemoryStore()
