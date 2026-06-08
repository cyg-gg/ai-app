import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@langchain/core/prompts', () => ({
  ChatPromptTemplate: {
    fromMessages: () => ({
      pipe: (next) => next,
    }),
  },
}))

vi.mock('@langchain/core/output_parsers', () => ({
  StringOutputParser: class {
    pipe(next) {
      return next
    }
    invoke(input) {
      return typeof input === 'string' ? input : 'mock-answer'
    }
    async *stream() {
      yield '你好'
      yield '，有什么可以帮你的？'
    }
  },
}))

// Mock 模型，不真实调用 API
vi.mock('../../models/llm.js', () => ({
  getChatModel: () => ({
    invoke: async () => '你好，有什么可以帮你的？',
    stream: async function* () {
      yield '你好'
      yield '，有什么可以帮你的？'
    },
  }),
  getFastModel: () => ({
    invoke: async () => '摘要内容',
  }),
}))

import { chatStream } from '../../chains/chat.js'
import { memoryStore } from '../../memory/store.js'

describe('chatStream', () => {
  beforeEach(() => {
    memoryStore.sessions.clear()
    memoryStore.metadata.clear()
  })

  it('应该返回流式迭代器', async () => {
    const { stream, onComplete } = await chatStream('session-1', '你好')
    const chunks = []
    for await (const chunk of stream) {
      chunks.push(chunk)
    }
    expect(chunks.join('')).toContain('你好')
    await onComplete(chunks.join(''))
  })

  it('应该保存消息到 memoryStore', async () => {
    const { stream, onComplete } = await chatStream('session-2', '测试消息')
    let full = ''
    for await (const c of stream) full += c
    await onComplete(full)

    const messages = await memoryStore.getMessages('session-2')
    expect(messages.length).toBeGreaterThan(0)
  })
})
