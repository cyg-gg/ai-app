export function errorHandler(err, req, res, next) {
  console.error('❌ 错误:', err)

  // LangChain API 错误
  if (err.status === 429) {
    return res.status(429).json({ error: 'AI 服务请求频率超限，请稍后重试' })
  }
  if (err.status === 401) {
    return res.status(401).json({ error: 'AI 服务认证失败，请检查 API Key' })
  }
  if (err.code === 'context_length_exceeded') {
    return res.status(400).json({ error: '对话内容过长，请开启新对话' })
  }

  res.status(500).json({
    error:   err.message || '服务内部错误',
    message: process.env.NODE_ENV === 'development' ? err.stack || err.message : undefined,
  })
}