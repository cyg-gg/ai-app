import { tool } from '@langchain/core/tools'
import { z }    from 'zod'

export const calculatorTool = tool(
  async ({ expression }) => {
    try {
      if (/[a-zA-Z]/.test(expression)) return '无效的数学表达式'
      const sanitized = expression.replace(/[^0-9+\-*/.()%\s]/g, '')
      if (!sanitized) return '无效的数学表达式'
      // eslint-disable-next-line no-new-func
      const result = new Function(`"use strict"; return (${sanitized})`)()
      return `计算结果: ${expression} = ${result}`
    } catch (e) {
      return `计算错误: ${e.message}`
    }
  },
  {
    name: 'calculator',
    description: '执行数学计算，支持加减乘除、括号、百分比等',
    schema: z.object({ expression: z.string().describe('要计算的数学表达式，如: (100 + 200) * 0.8') }),
  }
)