import 'dotenv/config'

function cleanEnv(value) {
  if (!value) return value
  return String(value).split('#')[0].trim()
}

export const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  isDev: process.env.NODE_ENV !== 'production',

  openai: {
    apiKey:         cleanEnv(process.env.OPENAI_API_KEY),
    baseURL:        cleanEnv(process.env.OPENAI_BASE_URL),
    model:          cleanEnv(process.env.OPENAI_MODEL) || 'gpt-4o',
    embeddingModel: cleanEnv(process.env.OPENAI_EMBEDDING_MODEL) || 'text-embedding-3-small',
  },

  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY,
  },

  pinecone: {
    apiKey: process.env.PINECONE_API_KEY,
    index:  process.env.PINECONE_INDEX,
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  jwt: {
    secret: process.env.JWT_SECRET,
  },

  rateLimit: {
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
    max:      Number(process.env.RATE_LIMIT_MAX) || 30,
  },
}

// 启动时校验必要配置
const required = ['OPENAI_API_KEY']
required.forEach(key => {
  if (!process.env[key]) {
    console.error(`❌ 缺少环境变量: ${key}`)
    process.exit(1)
  }
})