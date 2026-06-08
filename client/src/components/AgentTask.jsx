import { useState } from 'react'
import { useI18n } from '../hooks/useI18n'
import './AgentTask.css'

// 工具图标映射
const TOOL_ICONS = {
  web_search:  '🔍',
  calculator:  '🧮',
  get_weather: '🌤',
}

function StepItem({ step, index }) {
  const [expanded, setExpanded] = useState(false)
  const icon = TOOL_ICONS[step.tool] || '🔧'

  return (
    <div className="step">
      <div className="step__header" onClick={() => setExpanded(e => !e)}>
        <span className="step__index">{index + 1}</span>
        <span className="step__icon">{icon}</span>
        <span className="step__tool">{step.tool}</span>
        {step.input && (
          <span className="step__input">
            {typeof step.input === 'object'
              ? Object.values(step.input)[0]
              : step.input}
          </span>
        )}
        <span className="step__toggle">{expanded ? '▲' : '▼'}</span>
      </div>

      {expanded && step.result && (
        <div className="step__result">
          <pre>{step.result}</pre>
        </div>
      )}
    </div>
  )
}

export default function AgentTask({ task }) {
  const { t } = useI18n()
  const [showSteps, setShowSteps] = useState(false)

  const statusMap = {
    running: { icon: '⏳', label: t('agent.status.running', '执行中'), cls: 'running' },
    done:    { icon: '✅', label: t('agent.status.done', '完成'),   cls: 'done'    },
    error:   { icon: '❌', label: t('agent.status.error', '出错'),   cls: 'error'   },
  }
  const { icon, label, cls } = statusMap[task.status] || statusMap.running

  return (
    <div className={`agent-task agent-task--${cls}`}>
      {/* 任务头 */}
      <div className="task__header">
        <span className="task__status-icon">{icon}</span>
        <div className="task__info">
          <div className="task__input">❓ {task.input}</div>
          <div className="task__meta">
            <span className={`task__badge badge--${cls}`}>{label}</span>
            <span className="task__time">
              {new Date(task.ts).toLocaleTimeString('zh-CN')}
            </span>
            {task.steps?.length > 0 && (
              <button
                className="task__steps-btn"
                onClick={() => setShowSteps(v => !v)}
              >
                🔗 {task.steps.length} {t('agent.steps', '步')} {showSteps ? '▲' : '▼'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 步骤列表 */}
      {showSteps && task.steps?.length > 0 && (
        <div className="task__steps">
          {task.steps.map((step, i) => (
            <StepItem key={i} step={step} index={i} />
          ))}
        </div>
      )}

      {/* 最终输出 */}
      {task.output && (
        <div className="task__output">
          <span className="output__label"> {t('agent.conclusion', '结论')}</span>
          <p className="output__content" style={{ whiteSpace: 'pre-wrap' }}>{task.output}</p>
        </div>
      )}
    </div>
  )
}
