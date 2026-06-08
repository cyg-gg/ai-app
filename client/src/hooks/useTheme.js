import { useEffect, useCallback, useRef, useState } from 'react'

const STORAGE_KEY = 'ai-app-theme-settings'

// ── 同步工具函数 ──

function getStorage() {
  try { return window.localStorage } catch { return null }
}

function loadSettingsSync() {
  try {
    const storage = getStorage()
    if (!storage) return null
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function getSystemTheme() {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function parseTime(value) {
  const match = /^([0-1]\d|2[0-3]):([0-5]\d)$/.exec(value || '')
  if (!match) return null
  return { hour: Number(match[1]), minute: Number(match[2]) }
}

function minutesSinceMidnight(date = new Date()) {
  return date.getHours() * 60 + date.getMinutes()
}

function computeTheme(settings, systemTheme, now = new Date()) {
  if (settings.mode === 'manual-light') return 'light'
  if (settings.mode === 'manual-dark') return 'dark'

  if (settings.mode === 'schedule' && settings.scheduleEnabled) {
    const light = parseTime(settings.lightTime)
    const dark = parseTime(settings.darkTime)
    if (light && dark) {
      const current = minutesSinceMidnight(now)
      const lm = light.hour * 60 + light.minute
      const dm = dark.hour * 60 + dark.minute
      if (lm === dm) return 'light'
      return lm < dm
        ? (current >= lm && current < dm ? 'light' : 'dark')
        : (current >= lm || current < dm ? 'light' : 'dark')
    }
  }

  return systemTheme
}

const DEFAULT_SETTINGS = {
  mode: 'system',
  scheduleEnabled: false,
  lightTime: '08:00',
  darkTime: '20:00',
}

// ⚡ 同步初始化：在组件挂载前就从 localStorage 恢复设置
function initSettings() {
  const saved = loadSettingsSync()
  return saved ? { ...DEFAULT_SETTINGS, ...saved } : DEFAULT_SETTINGS
}

function initTheme() {
  const settings = initSettings()
  const system = getSystemTheme()
  return computeTheme(settings, system)
}

export function useTheme() {
  // 使用函数式初始值，同步从 localStorage 读取，杜绝闪烁
  const [settings, setSettings] = useState(initSettings)
  const [systemTheme, setSystemTheme] = useState(getSystemTheme)
  const [theme, setTheme] = useState(() => {
    const t = initTheme()
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.theme = t
    }
    return t
  })

  // 在非首次挂载时（主题切换时）添加 .theme-safe 启用过渡动画
  const isFirst = useRef(true)
  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false
      return
    }
    document.documentElement.classList.add('theme-safe')
  }, [theme])

  // 持久化 settings 到 localStorage
  const storage = useRef(null)
  useEffect(() => {
    storage.current = getStorage()
  }, [])

  useEffect(() => {
    if (!storage.current) return
    storage.current.setItem(STORAGE_KEY, JSON.stringify(settings))
  }, [settings])

  // 监听系统主题变化
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => setSystemTheme(media.matches ? 'dark' : 'light')
    media.addEventListener?.('change', onChange)
    return () => media.removeEventListener?.('change', onChange)
  }, [])

  // settings 或系统主题变化 → 重新计算主题并应用到 DOM
  useEffect(() => {
    const resolved = computeTheme(settings, systemTheme)
    setTheme(resolved)
    document.documentElement.dataset.theme = resolved
  }, [settings, systemTheme])

  // 定时切换：每 30s 检查一次
  useEffect(() => {
    if (settings.mode !== 'schedule' || !settings.scheduleEnabled) return
    const timer = setInterval(() => {
      const t = computeTheme(settings, systemTheme)
      setTheme(t)
      document.documentElement.dataset.theme = t
    }, 30_000)
    return () => clearInterval(timer)
  }, [settings, systemTheme])

  const setManualLight   = useCallback(() => setSettings(s => ({ ...s, mode: 'manual-light' })), [])
  const setManualDark    = useCallback(() => setSettings(s => ({ ...s, mode: 'manual-dark' })), [])
  const setSystem        = useCallback(() => setSettings(s => ({ ...s, mode: 'system' })), [])
  const restoreAuto      = useCallback(() => setSettings(s => ({ ...s, mode: s.scheduleEnabled ? 'schedule' : 'system' })), [])
  const setSchedule      = useCallback(enabled => setSettings(s => ({ ...s, mode: 'schedule', scheduleEnabled: enabled })), [])
  const updateSchedule   = useCallback(partial => setSettings(s => ({ ...s, ...partial })), [])
  const toggleTheme      = useCallback(() => {
    setSettings(s => {
      if (s.mode === 'manual-light') return { ...s, mode: 'manual-dark' }
      if (s.mode === 'manual-dark') return { ...s, mode: 'manual-light' }
      // 当前是自动模式，根据当前主题切换
      const currentTheme = document.documentElement.dataset.theme || 'light'
      return { ...s, mode: currentTheme === 'dark' ? 'manual-light' : 'manual-dark' }
    })
  }, [])

  return {
    theme,
    settings,
    systemTheme,
    setManualLight,
    setManualDark,
    setSystem,
    restoreAuto,
    setSchedule,
    updateSchedule,
    toggleTheme,
  }
}