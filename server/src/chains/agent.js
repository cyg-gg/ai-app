import { createToolCallingAgent } from '@langchain/classic/agents'
import { AgentExecutor }          from '@langchain/classic/agents'
import { ChatPromptTemplate }     from '@langchain/core/prompts'
import { getChatModel }           from '../models/llm.js'
import { searchTool }             from '../tools/search.js'
import { calculatorTool }         from '../tools/calculator.js'
import { weatherTool }            from '../tools/weather.js'

// ── 工具注册 ──
// Agent 可用的工具列表，注册后 LLM 可通过 function calling 调用
const tools = [searchTool, calculatorTool, weatherTool]

// ── 提示词模板 ──
// createToolCallingAgent 利用模型原生的 function calling 能力
// 不需要手写 ReAct 格式（Thought/Action/...），模型自动处理
const AGENT_PROMPT = ChatPromptTemplate.fromMessages([   ///ChatPromptTemplate 就是把模板字符串 + 变量填充 + 多角色消息格式打包好的工具。 直接用 fromMessages() 定义结构，invoke({ input: "你好"
 // }) 运行时自动替换变量并生成 LLM 需要的消息格式。
  ['system', `你是一个有用的 AI 助手，可以通过调用工具来获取实时信息。
当前时间：{currentTime}`],
  ['placeholder', '{chat_history}'],
  ['human', '{input}'],
  ['placeholder', '{agent_scratchpad}'],
])

/**
 * 构建 Agent 执行器
 * createToolCallingAgent: 使用模型原生的 function calling（比 ReAct 更稳定）
 * AgentExecutor: 运行 Agent 循环（思考→调工具→观察→再思考...）
 */
async function buildAgentExecutor() {
  const agent = await createToolCallingAgent({
    llm:    getChatModel({ temperature: 0 }),
    tools,
    prompt: AGENT_PROMPT,
  })

  return new AgentExecutor({
    agent,
    tools,
    maxIterations:           8,
    returnIntermediateSteps: true,
    verbose:                 process.env.NODE_ENV === 'development',
  })
}

// ── 单例模式 ──
let _executor = null
async function getExecutor() {
  if (!_executor) _executor = await buildAgentExecutor()
  return _executor
}

/**
 * 运行 Agent
 * @param {string}   userInput - 用户输入
 * @returns {object} { output, steps }
 */
function isMathExpression(input) {
  return /^[0-9\s+\-*/().%]+$/.test(String(input || '').trim())
}

function safeCalculate(expression) {
  const sanitized = String(expression).replace(/%/g, '/100')
  if (!/^[0-9\s+\-*/().\/]+$/.test(sanitized)) {
    throw new Error('无效的数学表达式')
  }
  // eslint-disable-next-line no-new-func
  const value = new Function(`"use strict"; return (${sanitized})`)()
  if (!Number.isFinite(value)) throw new Error('计算结果无效')
  return value
}

function formatWeatherResult(raw) {
  try {
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (!data || typeof data !== 'object') return String(raw)
    return `北京天气：${data.天气}，温度${data.温度}，体感${data.体感}，湿度${data.湿度}，风速${data.风速}`
  } catch {
    return String(raw)
  }
}

async function answerSimpleQuestion(userInput) {
  const text = String(userInput || '').trim()
  const timeMatch = text.match(/今天.*天气|天气/i)
  if (timeMatch && /北京/.test(text)) {
    const result = await weatherTool.invoke({ city: '北京' })
    return {
      output: formatWeatherResult(result),
      steps: [{ tool: 'get_weather', input: { city: '北京' }, result }],
    }
  }
  return null
}

export async function runAgent(userInput) {
  if (isMathExpression(userInput)) {
    const value = safeCalculate(userInput)
    return {
      output: `计算结果: ${userInput} = ${value}`,
      steps: [{ tool: 'calculator', input: { expression: userInput }, result: String(value) }],
    }
  }

  const simple = await answerSimpleQuestion(userInput)
  if (simple) return simple

  const executor = await getExecutor()

  const result = await executor.invoke({
    input:       userInput,
    currentTime: new Date().toLocaleString('zh-CN'),
  })

  const steps = result.intermediateSteps?.map(step => ({
    tool:   step.action.tool,
    input:  step.action.toolInput,
    result: typeof step.observation === 'string'
      ? step.observation.slice(0, 300)
      : JSON.stringify(step.observation)?.slice(0, 300),
  })) || []

  const output = (() => {
    const raw = result.output && String(result.output).trim()
    if (raw) {
      try {
        const parsed = JSON.parse(raw)
        if (parsed && typeof parsed === 'object') {
          const city = parsed.城市 || parsed.city || ''
          const temp = parsed.温度 || parsed.temp || ''
          const feels = parsed.体感 || parsed.feels || ''
          const weather = parsed.天气 || parsed.weather || ''
          const humidity = parsed.湿度 || parsed.humidity || ''
          const wind = parsed.风速 || parsed.wind || ''
          return `${city}天气：${weather}，温度${temp}，体感${feels}，湿度${humidity}，风速${wind}`.trim()
        }
      } catch {}
      return raw
    }
    return steps.at(-1)?.result || '未生成有效结论，请检查模型或工具配置'
  })()

  return { output, steps }
}