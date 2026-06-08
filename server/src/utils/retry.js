// 带指数退避的重试
export async function withRetry(fn, options = {}) {
  const {
    maxRetries  = 3,
    baseDelay   = 1000,
    maxDelay    = 10000,
    retryOn     = [429, 500, 502, 503],
  } = options

  let lastError
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (e) {
      lastError = e
      const status = e.status || e.statusCode

      // 不在重试列表里，直接抛出
      if (!retryOn.includes(status)) throw e
      // 最后一次也失败了
      if (attempt === maxRetries) throw e

      // 指数退避 + 随机抖动
      const delay = Math.min(
        baseDelay * Math.pow(2, attempt) + Math.random() * 500,
        maxDelay
      )
      console.warn(`⚠️  第 ${attempt + 1} 次重试，${delay.toFixed(0)}ms 后重试...`)
      await new Promise(r => setTimeout(r, delay))
    }
  }
  throw lastError
}
