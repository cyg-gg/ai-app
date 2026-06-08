import rateLimit, { ipKeyGenerator } from 'express-rate-limit'
import { config } from '../config/index.js'

export const chatRateLimit = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max:      config.rateLimit.max,
  keyGenerator: (req) => req.headers['x-session-id'] || ipKeyGenerator(req),
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error:   '请求过于频繁，请稍后再试',
      retryAfter: Math.ceil(config.rateLimit.windowMs / 1000),
    })
  },
  skip: () => process.env.NODE_ENV === 'development',
})
