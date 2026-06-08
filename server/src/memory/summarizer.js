import { ChatPromptTemplate }  from '@langchain/core/prompts'
import { StringOutputParser }  from '@langchain/core/output_parsers'
import { getFastModel }        from '../models/llm.js'

const SUMMARY_PROMPT = ChatPromptTemplate.fromMessages([
  ['system', '请将以下对话历史压缩为简洁的摘要，保留关键信息、用户偏好和重要结论，用第三人称描述，不超过200字。'],
  ['human',  '{history}'],
])

// 当消息超过阈值时，将旧消息压缩为摘要
export async function summarizeHistory(messages, threshold = 10) {
  if (messages.length < threshold) return { summary: null, recentMessages: messages }

  const toSummarize = messages.slice(0, -6)   // 除最近6条外全部压缩
  const recent      = messages.slice(-6)       // 保留最近6条原文

  const historyText = toSummarize.map(m =>
    `${m._getType() === 'human' ? '用户' : 'AI'}：${m.content}`
  ).join('\n')

  const summary = await SUMMARY_PROMPT
    .pipe(getFastModel())
    .pipe(new StringOutputParser())
    .invoke({ history: historyText })

  return { summary, recentMessages: recent }
}
