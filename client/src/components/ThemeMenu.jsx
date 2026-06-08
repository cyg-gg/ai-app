import './ThemeMenu.css'

const MODES = [
  { key: 'manual-light', icon: '☀️', label: '浅色' },
  { key: 'manual-dark', icon: '🌙', label: '深色' },
  { key: 'system',      icon: '💻', label: '跟随系统' },
  { key: 'schedule',    icon: '⏰', label: '定时切换' },
]

export default function ThemeMenu({ open, settings, theme, onClose, onManualLight, onManualDark, onSystem, onRestoreAuto, onScheduleToggle, onScheduleChange }) {
  if (!open) return null

  const isScheduleMode = settings.mode === 'schedule'

  const handleModeClick = (key) => {
    if (key === 'manual-light') onManualLight()
    else if (key === 'manual-dark') onManualDark()
    else if (key === 'system') onSystem()
    else if (key === 'schedule') onScheduleToggle(!isScheduleMode)
  }

  return (
    <div className="theme-menu" role="menu" aria-label="主题设置">
      {/* 头部 */}
      <div className="theme-menu__header">
        <strong>🎨 主题设置</strong>
        <button className="theme-menu__close" onClick={onClose} aria-label="关闭">✕</button>
      </div>

      {/* 状态栏 */}
      <div className="theme-menu__status">
        <div className="theme-menu__status-item">
          <span className="theme-menu__status-label">当前主题</span>
          <span className="theme-menu__status-value">{theme === 'dark' ? '深色模式' : '浅色模式'}</span>
        </div>
        <span className={`theme-menu__status-badge ${theme === 'dark' ? 'theme-menu__status-badge--dark' : 'theme-menu__status-badge--light'}`}>
          {theme === 'dark' ? '🌙 深色' : '☀️ 浅色'}
        </span>
      </div>

      {/* 模式选择 */}
      <div className="theme-menu__section-title">显示模式</div>
      <div className="theme-menu__modes">
        {MODES.map(mode => (
          <button
            key={mode.key}
            className={`theme-menu__mode-btn ${settings.mode === mode.key ? 'is-active' : ''}`}
            onClick={() => handleModeClick(mode.key)}
          >
            <span className="theme-menu__mode-icon">{mode.icon}</span>
            <span>{mode.label}</span>
          </button>
        ))}
      </div>

      {/* 恢复自动 */}
      <button className="theme-menu__restore" onClick={onRestoreAuto}>
        ↻ 恢复自动模式
      </button>

      {/* 定时设置 */}
      <div className="theme-menu__schedule">
        <div className="theme-menu__schedule-toggle">
          <span>⏰ 定时切换</span>
          <label className="theme-menu__switch">
            <input
              type="checkbox"
              checked={settings.scheduleEnabled}
              onChange={e => onScheduleToggle(e.target.checked)}
            />
            <span className="slider" />
          </label>
        </div>

        <div className="theme-menu__time-inputs">
          <div className="theme-menu__time-row">
            <label>☀️ 亮色</label>
            <input
              type="time"
              value={settings.lightTime}
              onChange={e => onScheduleChange({ lightTime: e.target.value })}
              disabled={!settings.scheduleEnabled}
            />
          </div>
          <div className="theme-menu__time-row">
            <label>🌙 深色</label>
            <input
              type="time"
              value={settings.darkTime}
              onChange={e => onScheduleChange({ darkTime: e.target.value })}
              disabled={!settings.scheduleEnabled}
            />
          </div>
        </div>
      </div>
    </div>
  )
}