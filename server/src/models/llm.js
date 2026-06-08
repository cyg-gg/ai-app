import { ChatOpenAI } from '@langchain/openai'
import { ChatAnthropic } from '@langchain/anthropic'
import { config } from '../config/index.js'

class LocalHashEmbeddings {
  constructor(dimensions = 256) {
    this.dimensions = dimensions
  }

  _embed(text) {
    const vector = new Array(this.dimensions).fill(0)
    const tokens = String(text || '').toLowerCase().match(/[\p{L}\p{N}]+/gu) || []
    for (const token of tokens) {
      let hash = 0
      for (let i = 0; i < token.length; i += 1) {
        hash = (hash * 31 + token.charCodeAt(i)) >>> 0
      }
      vector[hash % this.dimensions] += 1
    }
    const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1
    return vector.map(value => value / norm)
  }

  async embedDocuments(texts) {
    return texts.map(text => this._embed(text))
  }

  async embedQuery(text) {
    return this._embed(text)
  }
}

// ── 聊天模型 ──

// 缓存模型实例，避免重复创建
let chatModelCache = null
let fastModelCache = null

export function getChatModel(options = {}) {
  if (!chatModelCache) {
    chatModelCache = new ChatOpenAI({
      apiKey: config.openai.apiKey,
      configuration: { baseURL: config.openai.baseURL },
      model: config.openai.model,
      temperature: 0.7,
      maxTokens: 2048,
    })
  }
  // 如果有额外选项，创建新实例
  if (Object.keys(options).length > 0) {
    return new ChatOpenAI({
      apiKey: config.openai.apiKey,
      configuration: { baseURL: config.openai.baseURL },
      model: config.openai.model,
      temperature: 0.7,
      maxTokens: 2048,
      ...options,
    })
  }
  return chatModelCache
}

// 快速模型（低延迟，用于群聊等简单任务）
export function getFastModel() {
  if (!fastModelCache) {
    fastModelCache = new ChatOpenAI({
      apiKey: config.openai.apiKey,
      configuration: { baseURL: config.openai.baseURL },
      model: 'deepseek-v4-flash',
      temperature: 0.7,
      maxTokens: 512,
    })
  }
  return fastModelCache
}

// Embedding 模型
export function getEmbeddings() {
  return new LocalHashEmbeddings()
}

// Claude 备用
export function getClaudeModel() {
  return new ChatAnthropic({
    apiKey: config.anthropic.apiKey,
    model: 'claude-3-5-sonnet-20241022',
  })
}