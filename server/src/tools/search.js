import { tool }  from '@langchain/core/tools'
import { z }     from 'zod'
import * as cheerio from 'cheerio'

export const searchTool = tool(
  async ({ query }) => {
    try {
      const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      })
      const html = await res.text()
      const $    = cheerio.load(html)

      const results = []
      $('.result__body').slice(0, 3).each((_, el) => {
        const title   = $(el).find('.result__title').text().trim()
        const snippet = $(el).find('.result__snippet').text().trim()
        const link    = $(el).find('.result__url').text().trim()
        if (title) results.push({ title, snippet, link })
      })

      if (!results.length) return '未找到相关结果'
      return results.map((r, i) =>
        `[${i + 1}] ${r.title}\n${r.snippet}\n来源: ${r.link}`
      ).join('\n\n')
    } catch (e) {
      return `搜索失败: ${e.message}`
    }
  },
  {
    name: 'web_search',
    description: '搜索互联网获取实时信息，适用于新闻、时事、最新数据',
    schema: z.object({ query: z.string().describe('搜索关键词') }),
  }
)