import { useState, useEffect, useRef } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { useChat } from './hooks/useChat'
import { useAgent } from './hooks/useAgent'
import { useTheme } from './hooks/useTheme'
import { useI18n } from './hooks/useI18n'
import { useShareConversation } from './hooks/useShareConversation'
import { liveShareAPI } from './api/liveShare'
import MessageList from './components/MessageList'
import InputBox from './components/InputBox'
import AgentTask from './components/AgentTask'
import RAGPanel from './components/RAGPanel'
import ThemeMenu from './components/ThemeMenu'
import LanguageSwitcher from './components/LanguageSwitcher'
import ChatShareButton from './components/ChatShareButton'
import LiveShareButton from './components/LiveShareButton'
import ShareModal from './components/ShareModal'
import ShareConversationPage from './pages/share/ShareConversationPage'
import LiveSharePage from './pages/live/LiveSharePage'
import GroupChatPage from './pages/group-chat/GroupChatPage'
import './App.css'

const TABS = [
  { id: 'chat', icon: '💬', label: '智能对话' },
  { id: 'rag', icon: '📚', label: '知识库' },
  { id: 'agent', icon: '🤖', label: 'Agent' },
  { id: 'group', icon: '👥', label: '群聊' },
]

function ChatPanel() {
  const { messages, loading, error, sendMessage, abort, reset, regenerate, sessionId, liveRoomId, setLiveRoomId } = useChat()
  const { loading: shareLoading, error: shareError, shareUrl, createShare, copyShareUrl } = useShareConversation()
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [shareNotice, setShareNotice] = useState('')
  const [liveLoading, setLiveLoading] = useState(false)

  const handleShare = async () => {
    setShareNotice('')
    try {
      await createShare(sessionId, t('chat.shareTitle', '当前对话分享'), messages)
      setOpen(true)
    } catch (e) {
      setShareNotice(e.message)
    }
  }

  const handleLiveShare = async () => {
    setShareNotice('')
    setLiveLoading(true)
    try {
      const result = await liveShareAPI.create(sessionId, t('liveShare.title', '实时共享当前对话'))
      setLiveRoomId(result.roomId)
      window.open(result.liveUrl.startsWith('http') ? result.liveUrl : `${window.location.origin}${result.liveUrl}`, '_blank')
    } catch (e) {
      setShareNotice(e.message)
    } finally {
      setLiveLoading(false)
    }
  }

  return (
    <div className="panel">
      {error && <div className="panel__error">️ {error}</div>}
      {shareError && <div className="panel__error">⚠️ {t('chat.shareFailed', '分享失败')}：{shareError}</div>}
      {shareNotice && <div className="panel__notice">ℹ️ {shareNotice}</div>}
      <MessageList messages={messages} loading={loading} />
      <div className="panel__actions">
        {messages.length > 0 && !loading && <button className="action-btn" onClick={regenerate}>🔄 {t('chat.regenerate', '重新生成')}</button>}
        {messages.length > 0 && <button className="action-btn" onClick={reset}>🗑 {t('chat.clear', '清空对话')}</button>}
        {messages.length > 0 && <ChatShareButton onClick={handleShare} loading={shareLoading} />}
        {messages.length > 0 && <LiveShareButton onClick={handleLiveShare} loading={liveLoading} />}
      </div>
      {liveRoomId && <div className="panel__notice">📡 {t('chat.shareNotice', '当前对话已进入实时共享模式，后续消息会同步到共享页面。')}</div>}
      <InputBox onSend={sendMessage} onAbort={abort} loading={loading} placeholder={t('chat.placeholder', '有什么可以帮你的？')} />
      <ShareModal open={open} url={shareUrl} onCopy={async () => { await copyShareUrl(); alert(t('chat.linkCopied', '链接已复制')) }} onClose={() => setOpen(false)} />
    </div>
  )
}

function AgentPanel() {
  const { tasks, loading, error, run, clear } = useAgent()
  const { t } = useI18n()

  const SUGGESTED_PROMPTS = [
    { icon: '🔍', text: t('agent.suggestions.0', '帮我搜索一下最近的 AI 行业新闻') },
    { icon: '', text: t('agent.suggestions.1', '北京今天天气怎么样') },
    { icon: '🧮', text: t('agent.suggestions.2', '计算 3.14 * 25.6 的结果') },
    { icon: '🔍', text: t('agent.suggestions.3', '搜索端午节 2026 的放假安排') },
    { icon: '🧮', text: t('agent.suggestions.4', '帮我计算 (85 + 37) * 2.5') },
    { icon: '🌤', text: t('agent.suggestions.5', '查询上海的天气情况') },
  ]

  const handleSuggestion = (text) => {
    if (!loading) run(text)
  }

  return (
    <div className="panel">
      {error && <div className="panel__error">⚠️ {error}</div>}
      <div className="agent-list">{tasks.length === 0 && <div className="agent-empty"><div style={{ fontSize: 48 }}>🤖</div><p>{t('agent.description', 'Agent 会自动调用工具搜索、计算、查天气')}</p></div>}{tasks.map(task => <AgentTask key={task.id} task={task} />)}</div>
      {tasks.length > 0 && <div className="panel__actions"><button className="action-btn" onClick={clear}>🗑 {t('agent.clear', '清空记录')}</button></div>}
      <div className="agent-suggestions">
        <div className="agent-suggestions__label">{t('agent.suggestionLabel', '试试这些任务')}</div>
        <div className="agent-suggestions__list">
          {SUGGESTED_PROMPTS.map((p, i) => (
            <button key={i} className="agent-suggestion-chip" onClick={() => handleSuggestion(p.text)} disabled={loading}>
              <span>{p.icon}</span>
              <span>{p.text}</span>
            </button>
          ))}
        </div>
      </div>
      <InputBox onSend={run} loading={loading} placeholder={t('agent.placeholder', '描述你的任务，Agent 会自动分步执行...')} />
    </div>
  )
}

function MainShell() {
  const [activeTab, setActiveTab] = useState('chat')
  const [themeOpen, setThemeOpen] = useState(false)
  const themeButtonRef = useRef(null)
  const navigate = useNavigate()
  const location = useLocation()
  const { theme, settings, systemTheme, setManualLight, setManualDark, setSystem, restoreAuto, setSchedule, updateSchedule, toggleTheme } = useTheme()
  const { t, lang } = useI18n()

  const TABS = [
    { id: 'chat', icon: '💬', label: t('app.tabs.chat', '智能对话') },
    { id: 'rag', icon: '📚', label: t('app.tabs.rag', '知识库') },
    { id: 'agent', icon: '🤖', label: t('app.tabs.agent', 'Agent') },
    { id: 'group', icon: '👥', label: t('app.tabs.group', '群聊') },
  ]

  useEffect(() => {
    const onClickOutside = (e) => {
      if (themeButtonRef.current && !themeButtonRef.current.contains(e.target)) setThemeOpen(false)
    }
    document.addEventListener('click', onClickOutside)
    return () => document.removeEventListener('click', onClickOutside)
  }, [])

  useEffect(() => {
    if (location.pathname === '/group-chat') setActiveTab('group')
    if (location.pathname === '/') setActiveTab('chat')
  }, [location.pathname])

  const activeLabel = TABS.find(t => t.id === activeTab)?.label
  const activeIcon = TABS.find(t => t.id === activeTab)?.icon

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar__brand"><span className="brand__icon">🧠</span><span className="brand__name">AI Studio</span></div>
        <nav className="sidebar__nav">
          {TABS.map(tab => (
            <button
              key={tab.id}
              className={`nav-item ${activeTab === tab.id ? 'nav-item--active' : ''}`}
              onClick={() => {
                setActiveTab(tab.id)
                if (tab.id === 'group') navigate('/group-chat')
                if (tab.id !== 'group') navigate('/')
              }}
            >
              <span className="nav-item__icon">{tab.icon}</span>
              <span className="nav-item__label">{tab.label}</span>
            </button>
          ))}
        </nav>
        <footer className="sidebar__footer">
          <div className="footer__info">
            <span className="dot dot--green" />
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>运行中</span>
          </div>
        </footer>
      </aside>
      <main className="main">
        <header className="main__header">
          <h2>{activeIcon} {activeLabel}</h2>
          <div className="main__tools" ref={themeButtonRef}>
            <LanguageSwitcher />
            <button className="theme-toggle" onClick={() => setThemeOpen(v => !v)} title={`点击打开主题设置（当前：${theme === 'dark' ? '深色' : '浅色'}）`}>
              <span className="theme-toggle__icon">{theme === 'dark' ? '🌙' : '☀️'}</span>
              <span className="theme-toggle__label">{theme === 'dark' ? '深色' : '浅色'}</span>
              <span className="theme-toggle__chevron">▾</span>
            </button>
            <ThemeMenu
              open={themeOpen}
              settings={settings}
              theme={theme}
              systemTheme={systemTheme}
              onClose={() => setThemeOpen(false)}
              onManualLight={() => { setManualLight(); setThemeOpen(false) }}
              onManualDark={() => { setManualDark(); setThemeOpen(false) }}
              onSystem={() => { setSystem(); setThemeOpen(false) }}
              onRestoreAuto={() => { restoreAuto(); setThemeOpen(false) }}
              onScheduleToggle={(enabled) => setSchedule(enabled)}
              onScheduleChange={updateSchedule}
            />
          </div>
        </header>

        <div className="main__body">
          {activeTab === 'chat' && <ChatPanel />}
          {activeTab === 'rag' && <RAGPanel />}
          {activeTab === 'agent' && <AgentPanel />}
        </div>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/*" element={<MainShell />} />
      <Route path="/share/:token" element={<ShareConversationPage />} />
      <Route path="/live/:roomId" element={<LiveSharePage />} />
      <Route path="/group-chat" element={<GroupChatPage />} />
    </Routes>
  )
}
