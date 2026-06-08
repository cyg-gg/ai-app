import { describe, it, expect } from 'vitest'
import { calculatorTool }       from '../../tools/calculator.js'

describe('calculatorTool', () => {
  it('基本加法', async () => {
    const result = await calculatorTool.invoke({ expression: '1 + 1' })
    expect(result).toContain('2')
  })

  it('复杂表达式', async () => {
    const result = await calculatorTool.invoke({ expression: '(100 + 200) * 0.8' })
    expect(result).toContain('240')
  })

  it('防注入：过滤非法字符', async () => {
    const result = await calculatorTool.invoke({ expression: 'alert(1)' })
    expect(result).toContain('无效')
  })
})
