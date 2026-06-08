import { useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useLiveShare } from '../../hooks/useLiveShare'
import { useI18n } from '../../hooks/useI18n'
import MessageList from '../../components/MessageList'

export default function LiveSharePage() {
  const { t } = useI18n()
  const { roomId } = useParams()
  const navigate = useNavigate()
  const [draft, setDraft] = useState('')
  const [copyTip, setCopyTip] = useState('')
  const { room, messages, loading, error, connected, sendMessage } = useLiveShare(roomId)

  const liveUrl = useMemo(() => `${window.location.origin}/live/${roomId}`, [roomId])

  const handleCopy = async () => {
    await navigator.clipboard.writeText(liveUrl)
    setCopyTip(t('liveShare.linkCopied', '链接已复制'))
    setTimeout(() => setCopyTip(''), 1500)
  }

  return (
    <div className="app">
      <main className="main" style={{ width: '100%' }}>
        <header className="main__header">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <h2>📡 {room?.title || t('liveShare.title', '实时共享会话')}</h2>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{connected ? t('liveShare.realtime', '实时连接中') : t('liveShare.polling', '轮询降级')} · {t('liveShare.sameSession', '你和对方看到的是同一个会话')}</span>
              <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>Room: {roomId}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="action-btn" onClick={handleCopy}>{t('liveShare.copyLink', '复制实时链接')}</button>
            <button className="action-btn" onClick={() => navigate('/')}>{t('liveShare.backHome', '返回首页')}</button>
          </div>
        </header>

        {copyTip && <div className="panel__notice">ℹ️ {copyTip}</div>}
        {error && <div className="panel__error">⚠️ {error}</div>}

        <div className="main__body">
          <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: 12 }}>
            {t('liveShare.liveUrl', '实时共享链接')}：{liveUrl}
          </div>
          <MessageList messages={messages} loading={false} />
          <div className="input-box">
            <div className="input-box__toolbar">
              <span className="toolbar__tip">{t('liveShare.toolbarTip', '实时共享会话 · 双方都可发消息')}</span>
              <span className="toolbar__count">{connected ? t('liveShare.realtime', '实时') : t('liveShare.polling', '轮询')}</span>
            </div>
            <div className="input-box__row">
              <textarea value={draft} onChange={e => setDraft(e.target.value)} placeholder={t('liveShare.placeholder', '输入消息...')} />
              <button className="btn-send" disabled={loading || !draft.trim()} onClick={async () => { await sendMessage(draft); setDraft('') }}>↑</button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
