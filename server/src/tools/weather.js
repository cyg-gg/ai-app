import { tool } from '@langchain/core/tools'
import { z }    from 'zod'

export const weatherTool = tool(
  async ({ city }) => {
    try {
      const res  = await fetch(`https://wttr.in/${encodeURIComponent(city)}?format=j1`)
      const data = await res.json()
      const cur  = data.current_condition[0]
      return JSON.stringify({
        城市:   city,
        温度:   `${cur.temp_C}°C`,
        体感:   `${cur.FeelsLikeC}°C`,
        天气:   cur.weatherDesc[0].value,
        湿度:   `${cur.humidity}%`,
        风速:   `${cur.windspeedKmph} km/h`,
      })
    } catch (e) {
      return `获取天气失败: ${e.message}`
    }
  },
  {
    name: 'get_weather',
    description: '获取指定城市的实时天气信息',
    schema: z.object({ city: z.string().describe('城市名称，支持中英文') }),
  }
)