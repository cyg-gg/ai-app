import { Router }        from 'express'
import { runAgent }      from '../chains/agent.js'
import { chatRateLimit } from '../middleware/rateLimit.js'

const router = Router()

// 普通 Agent 调用
router.post('/', chatRateLimit, async (req, res, next) => {
  try {
    const { input } = req.body
    if (!input?.trim()) return res.status(400).json({ error: '输入不能为空' })

    const result = await runAgent(input)
    res.json({
      success: true,
      output: result.output,
      steps:  result.steps,
    })
  } catch (e) {
    console.error('Agent run failed:', e)
    res.status(500).json({ error: e.message || 'Agent 执行失败' })
  }
})

// Agent 流式调用（SSE 实时推送每一步）
router.post('/stream', chatRateLimit, async (req, res, next) => {
  try {
    const { input } = req.body
    if (!input?.trim()) return res.status(400).json({ error: '输入不能为空' })

    res.setHeader('Content-Type',  'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection',    'keep-alive')

    const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`)

    // 实时推送思考步骤
    const result = await runAgent(input, (step) => {
      send({ type: 'step', ...step })
    })

    send({ type: 'done', output: result.output, steps: result.steps })
    res.end()
  } catch (e) {
    res.write(`data: ${JSON.stringify({ type: 'error', message: e.message })}\n\n`)
    res.end()
  }
})

export default router


