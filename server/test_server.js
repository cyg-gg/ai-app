import express from 'express'
import cors from 'cors'
import agentRoutes from './src/routes/agent.js'
import { chatRateLimit } from './src/middleware/rateLimit.js'
import { ChatOpenAI } from '@langchain/openai'
import { config } from './src/config/index.js'

// 创建测试用的 ChatOpenAI 实例
console.log('Creating ChatOpenAI instance...')
const testModel = new ChatOpenAI({
  apiKey: config.openai.apiKey,
  configuration: { baseURL: config.openai.baseURL },
  model: config.openai.model,
  temperature: 0.7,
  maxTokens: 2048,
})

console.log('Model instance created successfully:', testModel.constructor?.name)

// 创建 Express 应用
const app = express()
app.use(cors())
app.use(express.json())

// 测试路由
app.get('/test', (req, res) => {
  res.json({ message: 'Test successful' })
})

// 模拟 API 路由
app.post('/api/agent/test', async (req, res) => {
  try {
    console.log('Request received:', req.body)

    // 使用与 llm.js 相同的配置
    const testModel2 = new ChatOpenAI({
      apiKey: config.openai.apiKey,
      configuration: { baseURL: config.openai.baseURL },
      model: config.openai.model,
      temperature: req.body.temperature || 0.7,
      maxTokens: 2048,
    })

    console.log('Second model created:', testModel2.constructor?.name)

    res.json({
      success: true,
      modelType: testModel2.constructor?.name
    })
  } catch (error) {
    console.error('Error:', error)
    res.json({
      success: false,
      error: error.message,
      stack: error.stack
    })
  }
})

const PORT = 3001
app.listen(PORT, () => {
  console.log(`Test server running on http://localhost:${PORT}`)
})