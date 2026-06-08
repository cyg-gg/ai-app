import { trimMessages }  from '@langchain/core/messages'
import { getChatModel }  from '../models/llm.js'

// 按 token 数裁剪历史消息
export async function trimHistory(messages, maxTokens = 2000) {
  if (!messages.length) return messages

  return trimMessages(messages, {
    maxTokens,
    tokenCounter:   getChatModel(),   // 用模型自带的 tokenizer 计数
    strategy:       'last',           // 保留最新的消息
    startOn:        'human',          // 必须从 human 消息开始
    includeSystem:  true,             // 保留 system 消息
    allowPartial:   false,
  })
}

// 按条数裁剪（简单场景）
export function trimByCount(messages, maxCount = 20) {
  if (messages.length <= maxCount) return messages
  // 保留 system + 最新 maxCount 条
  const system  = messages.filter(m => m._getType() === 'system')
  const rest    = messages.filter(m => m._getType() !== 'system')
  return [...system, ...rest.slice(-maxCount)]
}