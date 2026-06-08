import { ChatPromptTemplate }        from '@langchain/core/prompts'
import { StringOutputParser }        from '@langchain/core/output_parsers'
import { RunnableSequence, RunnableParallel } from '@langchain/core/runnables'
import { RunnablePassthrough }       from '@langchain/core/runnables'
import { getChatModel }              from '../models/llm.js'
import { vectorStoreManager }        from '../vectorstore/index.js'

const RAG_PROMPT = ChatPromptTemplate.fromMessages([
  ['system', `你是一个知识库问答助手，严格根据以下检索到的上下文来回答问题。

规则：
- 只使用上下文中提供的信息来回答
- 如果上下文包含相关信息，请直接回答并注明来源
- 如果上下文中没有回答该问题所需的信息，请说"知识库中未找到相关信息"
- 不要自己补充知识库以外的内容
- 回答简洁、准确

上下文：
{context}`],
  ['human', '{question}'],
])

// 格式化检索结果（兼容带分数和不带分数的两种格式）
function formatDocs(docs) {
  if (!docs?.length) return '未找到相关内容'
  return docs
    .map((item, i) => {
      // item 可能是 [doc, score] 或直接是 doc
      const [doc, score] = Array.isArray(item) ? item : [item, 1]
      const source = doc.metadata?.source || '未知来源'
      const page   = doc.metadata?.page ? `第${doc.metadata.page}页` : ''
      return `[片段${i + 1}] 相关度:${(score * 100).toFixed(1)}% 来源:${source}${page}\n${doc.pageContent}`
    })
    .join('\n\n')
}

const TOP_K = 6
const SCORE_THRESHOLD = 0.3

export async function ragQuery(storeName, question) {
  await vectorStoreManager.ready
  const retriever = vectorStoreManager.getRetriever(storeName, TOP_K)

  const chain = RunnableSequence.from([
    RunnableParallel.from({
      context:  retriever.pipe(formatDocs),
      question: new RunnablePassthrough(),
    }),
    RAG_PROMPT,
    getChatModel(),
    new StringOutputParser(),
  ])

  // 同时返回答案和检索到的原始文档
  const [answer, sourceDocs] = await Promise.all([
    chain.invoke(question),
    vectorStoreManager.search(storeName, question, TOP_K),
  ])

  return {
    answer,
    sources: (sourceDocs || [])
      .map(item => {
        const [doc, score] = Array.isArray(item) ? item : [item, 1]
        return { doc, score }
      })
      .filter(({ score }) => score >= SCORE_THRESHOLD)
      .map(({ doc, score }) => ({
        content: doc.pageContent.slice(0, 200),
        score:   score.toFixed(3),
        source:  doc.metadata?.source,
      })),
  }
}

// RAG 流式
export async function ragStream(storeName, question) {
  await vectorStoreManager.ready
  const retriever = vectorStoreManager.getRetriever(storeName, TOP_K)
  const docs      = await retriever.invoke(question)
  const items     = Array.isArray(docs) ? docs.map(d => [d, 1]) : []
  const context   = formatDocs(items)

  const stream = await RAG_PROMPT
    .pipe(getChatModel())
    .pipe(new StringOutputParser())
    .stream({ context, question })

  return stream
}