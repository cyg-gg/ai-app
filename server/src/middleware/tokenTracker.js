import { BaseCallbackHandler } from '@langchain/core/callbacks/base'

// 全局用量统计
const stats = {
  totalRequests: 0,
  totalTokens:   0,
  totalCost:     0,
  bySession:     new Map(),
}

// GPT-4o 价格（$/1K tokens）
const PRICE = { input: 0.005, output: 0.015 }

export class TokenTracker extends BaseCallbackHandler {
  name = 'TokenTracker'

  constructor(sessionId) {
    super()
    this.sessionId = sessionId
  }

  handleLLMEnd(output) {
    const usage = output.llmOutput?.tokenUsage
    if (!usage) return

    const cost = (
      (usage.promptTokens     || 0) / 1000 * PRICE.input +
      (usage.completionTokens || 0) / 1000 * PRICE.output
    )

    stats.totalRequests++
    stats.totalTokens += usage.totalTokens || 0
    stats.totalCost   += cost

    // 按 session 统计
    if (this.sessionId) {
      const s = stats.bySession.get(this.sessionId) || { tokens: 0, cost: 0, calls: 0 }
      s.tokens += usage.totalTokens || 0
      s.cost   += cost
      s.calls++
      stats.bySession.set(this.sessionId, s)
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`📊 Token: ${usage.totalTokens} | 费用: $${cost.toFixed(6)} | 累计: $${stats.totalCost.toFixed(4)}`)
    }
  }
}

export function getStats() {
  return {
    ...stats,
    bySession: Object.fromEntries(stats.bySession),
  }
}
