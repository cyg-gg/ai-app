// 简单 API Key 鉴权（生产可替换为 JWT）
export function authMiddleware(req, res, next) {
  // 非生产环境跳过鉴权
  if (process.env.NODE_ENV !== 'production') return next()

  const apiKey = req.headers['x-api-key'] || req.query.apiKey
  if (!apiKey || apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: '未授权' })
  }
  next()
}
