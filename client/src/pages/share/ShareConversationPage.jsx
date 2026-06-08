import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { shareAPI } from '../../api/share'
import { useI18n } from '../../hooks/useI18n'
import MessageList from '../../components/MessageList'

export default function ShareConversationPage() {
  const { t } = useI18n()
  const { token } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    setError(null)
    shareAPI.getConversation(token)
      .then((result) => {
        setData(result)
      })
      .catch(e => setError(e.message || t('share.loadFailed', '分享数据加载失败')))
      .finally(() => setLoading(false))
  }, [token])

  const messages = useMemo(() => {
    const payload = data?.payload
    const list = Array.isArray(payload?.messages) ? payload.messages : []
    return list.map((m, idx) => ({
      id: `${m.role}-${idx}`,
      role: m.role,
      content: m.content,
      ts: m.ts,
      sources: m.sources,
    }))
  }, [data])

  if (loading) return <div className="app" style={{ padding: 24, alignItems: 'center', justifyContent: 'center' }}>{t('share.loading', '加载分享内容中...')}</div>
  if (error) return <div className="app" style={{ padding: 24, alignItems: 'center', justifyContent: 'center' }}>{t('share.unavailable', '分享不可用')}：{error}</div>
  if (!data) return <div className="app" style={{ padding: 24, alignItems: 'center', justifyContent: 'center' }}>{t('share.noContent', '暂无分享内容')}</div>

  return (
    <div className="app">
      <main className="main" style={{ width: '100%' }}>
        <header className="main__header">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <h2>🔗 {data.title}</h2>
            <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{t('share.readonly', '只读分享')} · {t('share.createdAt', '创建于')} {new Date(data.createdAt).toLocaleString()}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>Token: {token}</span>
            <button className="action-btn" onClick={() => navigate('/')}>{t('share.backHome', '返回首页')}</button>
          </div>
        </header>
        <div className="main__body">
          <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: 12 }}>
            {t('share.readonlyNotice', '该页面仅用于查看分享内容，不支持编辑或继续发送消息。')}
          </div>
          <MessageList messages={messages} loading={false} />
        </div>
      </main>
    </div>
  )
}
