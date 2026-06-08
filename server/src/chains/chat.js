import { ChatPromptTemplate }         from '@langchain/core/prompts'
import { StringOutputParser }         from '@langchain/core/output_parsers'
import { HumanMessage, AIMessage,
         SystemMessage }              from '@langchain/core/messages'
import { getChatModel }               from '../models/llm.js'
import { memoryStore }                from '../memory/store.js'
import { trimByCount }                from '../memory/trimmer.js'
import { summarizeHistory }           from '../memory/summarizer.js'
import { publish } from '../lib/liveShareEvents.js'

const buildPrompt = (summary) => ChatPromptTemplate.fromMessages([
  ['system', `你是一个专业、友好的 AI 助手。
${summary ? `
以下是之前对话的摘要：
${summary}
` : ''}
当前时间：{currentTime}`],
  ['placeholder', '{chat_history}'],
  ['human', '{input}'],
])

export async function chat(sessionId, userMessage, liveRoomId = null) {
  await memoryStore.addMessage(sessionId, 'human', userMessage)
  if (liveRoomId) {
    try { publish(liveRoomId, { type: 'message', message: { role: 'user', content: userMessage, ts: Date.now() } }) } catch {}
  }

  const allMessages = await memoryStore.getMessages(sessionId)
  const { summary, recentMessages } = await summarizeHistory(allMessages, 12)
  const trimmed = trimByCount(recentMessages, 10)

  const model  = getChatModel()
  const parser = new StringOutputParser()
  const prompt = buildPrompt(summary)
  const chain  = prompt.pipe(model).pipe(parser)

  const answer = await chain.invoke({
    input:        userMessage,
    chat_history: trimmed,
    currentTime:  new Date().toLocaleString('zh-CN'),
  })

  await memoryStore.addMessage(sessionId, 'ai', answer)
  if (liveRoomId) {
    try { publish(liveRoomId, { type: 'message', message: { role: 'assistant', content: answer, ts: Date.now() } }) } catch {}
  }
  return answer
}

export async function chatStream(sessionId, userMessage, liveRoomId = null) {
  await memoryStore.addMessage(sessionId, 'human', userMessage)
  if (liveRoomId) {
    try { publish(liveRoomId, { type: 'message', message: { role: 'user', content: userMessage, ts: Date.now() } }) } catch {}
  }

  const allMessages = await memoryStore.getMessages(sessionId)
  const { summary, recentMessages } = await summarizeHistory(allMessages, 12)
  const trimmed = trimByCount(recentMessages, 10)

  const model  = getChatModel()
  const parser = new StringOutputParser()
  const prompt = buildPrompt(summary)
  const chain  = prompt.pipe(model).pipe(parser)

  const stream = await chain.stream({
    input:        userMessage,
    chat_history: trimmed,
    currentTime:  new Date().toLocaleString('zh-CN'),
  })

  return {
    stream,
    onChunk: async (chunk, fullText) => {
      if (liveRoomId && chunk) {
        try { publish(liveRoomId, {
          type: 'message',
          message: { role: 'assistant', content: fullText, ts: Date.now(), delta: chunk, streaming: true },
        }) } catch {}
      }
    },
    onComplete: async (fullText) => {
      await memoryStore.addMessage(sessionId, 'ai', fullText)
      if (liveRoomId) {
        try { publish(liveRoomId, { type: 'message', message: { role: 'assistant', content: fullText, ts: Date.now(), done: true } }) } catch {}
      }
    },
  }
}
