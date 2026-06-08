import { StateGraph, END, START } from '@langchain/langgraph'
import { Annotation }             from '@langchain/langgraph'
import { ToolMessage }            from '@langchain/core/messages'
import { getChatModel }           from '../models/llm.js'
import { searchTool, calculatorTool, weatherTool } from '../tools/index.js'

const tools     = [searchTool, calculatorTool, weatherTool]
const toolMap   = Object.fromEntries(tools.map(t => [t.name, t]))
const modelWithTools = getChatModel({ temperature: 0 }).bindTools(tools)

// ── 状态定义 ──
const GraphState = Annotation.Root({
  messages: Annotation({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
})

// ── 节点：调用模型 ──
async function callModel(state) {
  const response = await modelWithTools.invoke(state.messages)
  return { messages: [response] }
}

// ── 节点：执行工具 ──
async function callTools(state) {
  const lastMsg = state.messages.at(-1)
  const results = []

  for (const toolCall of lastMsg.tool_calls) {
    const tool = toolMap[toolCall.name]
    if (!tool) {
      results.push(new ToolMessage({
        content:      `工具 ${toolCall.name} 不存在`,
        tool_call_id: toolCall.id,
      }))
      continue
    }
    try {
      const output = await tool.invoke(toolCall.args)
      results.push(new ToolMessage({
        content:      String(output),
        tool_call_id: toolCall.id,
        name:         toolCall.name,
      }))
    } catch (e) {
      results.push(new ToolMessage({
        content:      `工具执行失败: ${e.message}`,
        tool_call_id: toolCall.id,
      }))
    }
  }

  return { messages: results }
}

// ── 路由：是否继续调用工具 ──
function shouldContinue(state) {
  const lastMsg = state.messages.at(-1)
  if (lastMsg.tool_calls?.length > 0) return 'tools'
  return END
}

// ── 构建图 ──
const workflow = new StateGraph(GraphState)
  .addNode('model', callModel)
  .addNode('tools', callTools)
  .addEdge(START, 'model')
  .addConditionalEdges('model', shouldContinue, {
    tools: 'tools',
    [END]: END,
  })
  .addEdge('tools', 'model')

export const graph = workflow.compile()

// ── 执行入口 ──
export async function runGraph(userInput, onStep) {
  const { HumanMessage } = await import('@langchain/core/messages')

  const result = await graph.invoke(
    { messages: [new HumanMessage(userInput)] },
    {
      callbacks: [{
        handleToolStart: (tool, input) => {
          onStep?.({ type: 'tool_start', tool: tool.id?.[2], input })
        },
        handleToolEnd: (output) => {
          onStep?.({ type: 'tool_end', output: output.slice(0, 200) })
        },
      }],
    }
  )

  const lastMsg = result.messages.at(-1)
  const steps   = result.messages
    .filter(m => m._getType() === 'tool')
    .map(m => ({ tool: m.name, result: m.content?.slice(0, 300) }))

  return { output: lastMsg.content, steps }
}