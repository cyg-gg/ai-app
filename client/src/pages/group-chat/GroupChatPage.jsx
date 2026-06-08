import { useEffect, useMemo, useRef, useState } from 'react'
import { useGroupChat } from '../../hooks/useGroupChat'
import { useI18n } from '../../hooks/useI18n'

export default function GroupChatPage() {
  const [roomId, setRoomId] = useState('')
  const [draft, setDraft] = useState('')
  const [roomName, setRoomName] = useState('')
  const msgListRef = useRef(null)
  const { room, rooms, messages, loading, error, connected, sendMessage, loadRooms, createRoom, mySenderId } = useGroupChat(roomId)
  const { t } = useI18n()

  // 消息更新时自动滚动到底部
  useEffect(() => {
    if (msgListRef.current) {
      msgListRef.current.scrollTop = msgListRef.current.scrollHeight
    }
  }, [messages])

  // 从 URL 参数中获取房间 ID
  const urlRoomId = useMemo(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('room') || ''
  }, [])

  useEffect(() => {
    loadRooms().then(list => {
      if (!roomId && urlRoomId) {
        // URL 中有房间 ID，优先选择它
        const target = list.find(r => r.id === urlRoomId)
        if (target) setRoomId(urlRoomId)
        else if (list[0]) setRoomId(list[0].id)
      } else if (!roomId && list[0]) {
        setRoomId(list[0].id)
      }
    }).catch(() => {})
  }, [loadRooms, roomId, urlRoomId])

  const statusText = useMemo(() => connected ? t('groupChat.realtime', '实时连接中') : t('groupChat.polling', '轮询降级'), [connected, t])

  const handleCreateRoom = async () => {
    if (!roomName.trim()) return
    const { room: created } = await createRoom(roomName.trim())
    setRoomName('')
    setRoomId(created.id)
  }

  const handleRenameRoom = async (nextName) => {
    if (!roomId || !nextName.trim()) return
    await fetch((import.meta.env.VITE_API_URL || '') + `/api/group-chat/rooms/${roomId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name: nextName.trim() }),
    })
    await loadRooms()
  }

  const handleDeleteRoom = async () => {
    if (!roomId) return
    await fetch((import.meta.env.VITE_API_URL || '') + `/api/group-chat/rooms/${roomId}`, {
      method: 'DELETE',
      credentials: 'include',
    })
    setRoomId('')
    await loadRooms()
  }

  const handleSend = async () => {
    if (!draft.trim() || !roomId) return
    const content = draft.trim()
    setDraft('')
    await sendMessage(content)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleCopyLink = () => {
    // 使用公网地址而非 localhost
    const baseUrl = import.meta.env.VITE_API_URL || window.location.origin
    const url = baseUrl + '/group-chat?room=' + (room?.id || '')
    navigator.clipboard.writeText(url).then(() => {
      alert(t('groupChat.linkCopied', '链接已复制到剪贴板'))
    }).catch(() => {
      const input = document.createElement('input')
      input.value = url
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
      alert(t('groupChat.linkCopied', '链接已复制到剪贴板'))
    })
  }

  return (
    <div className="app">
      <main className="main" style={{ width: '100%' }}>
        <header className="main__header">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <h2>👥 {t('groupChat.title', '实时群聊')}</h2>
            <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{t('groupChat.currentRoom', '当前房间')}：{room?.name || t('groupChat.noRooms', '未选择')}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="action-btn" onClick={handleCopyLink} style={{ fontSize: 12, padding: '6px 12px' }}>
              🔗 {t('groupChat.copyLink', '复制链接')}
            </button>
            <span style={{ color: 'var(--text-secondary)' }}>{statusText}</span>
          </div>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', flex: 1, minHeight: 0 }}>
          <aside style={{ borderRight: '1px solid var(--border-color)', padding: 12, overflowY: 'auto', background: 'var(--panel-bg)' }}>
            <h4 style={{ marginBottom: 12 }}>{t('groupChat.roomManagement', '房间管理')}</h4>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <input
                value={roomName}
                onChange={e => setRoomName(e.target.value)}
                placeholder={t('groupChat.newRoom', '新建房间名')}
                style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--surface-2)', color: 'var(--text-primary)' }}
              />
              <button className="action-btn" onClick={handleCreateRoom}>{t('groupChat.create', '创建')}</button>
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <button className="action-btn" onClick={() => handleRenameRoom(prompt(t('groupChat.renamePrompt', '输入新房间名'), room?.name || '') || '')} disabled={!roomId}>{t('groupChat.rename', '重命名')}</button>
              <button className="action-btn" onClick={handleDeleteRoom} disabled={!roomId}>{t('groupChat.delete', '删除')}</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {rooms.length === 0 && <div style={{ color: 'var(--text-secondary)' }}>{t('groupChat.noRooms', '暂无房间')}</div>}
              {rooms.map(r => (
                <button
                  key={r.id}
                  onClick={() => setRoomId(r.id)}
                  style={{
                    display: 'block', width: '100%', padding: 10, borderRadius: 8,
                    border: roomId === r.id ? '1px solid var(--accent)' : '1px solid var(--border-color)',
                    background: roomId === r.id ? 'color-mix(in srgb, var(--accent) 10%, var(--panel-bg))' : 'var(--panel-bg)',
                    color: 'var(--text-primary)', textAlign: 'left'
                  }}
                >
                  <div style={{ fontWeight: 600 }}>{r.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>ID: {r.token || r.id}</div>
                </button>
              ))}
            </div>
          </aside>

          <section style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            {error && <div className="panel__error">⚠️ {error}</div>}
            <div className="msg-list" ref={msgListRef} style={{ flex: 1, padding: '12px 20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {room && messages.map(m => {
                const isMe = m.senderId === mySenderId
                const isAI = m.senderId === 'ai-bot'
                return (
                  <div key={m.id} style={{
                    display: 'flex',
                    justifyContent: isMe || isAI ? 'flex-start' : 'flex-start',
                    alignItems: 'flex-start',
                    gap: 8,
                    maxWidth: '70%',
                    alignSelf: isMe ? 'flex-end' : 'flex-start',
                  }}>
                    {!isMe && (
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontSize: 14, fontWeight: 600, flexShrink: 0,
                        background: isAI
                          ? 'linear-gradient(135deg, #6366f1 0%, #a78bfa 100%)'
                          : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      }}>
                        {isAI ? '🤖' : (m.senderName?.[0] || '?')}
                      </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: '100%' }}>
                      {!isMe && (
                        <span style={{
                          fontSize: 12,
                          color: isAI ? 'var(--accent)' : 'var(--text-secondary)',
                          marginLeft: 4,
                          fontWeight: isAI ? 600 : 400,
                        }}>
                          {isAI ? `🤖 ${t('groupChat.ai', 'AI')}` : m.senderName}
                        </span>
                      )}
                      <div style={{
                        padding: '10px 16px',
                        borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                        background: isMe
                          ? 'var(--accent)'
                          : isAI
                            ? 'color-mix(in srgb, var(--accent) 8%, var(--surface-2))'
                            : 'var(--surface-2)',
                        color: isMe ? '#fff' : 'var(--text-primary)',
                        fontSize: 14, lineHeight: 1.5,
                        wordBreak: 'break-word',
                        border: isAI ? '1px solid color-mix(in srgb, var(--accent) 20%, transparent)' : 'none',
                      }}>
                        {m.content}
                      </div>
                    </div>
                    {isMe && (
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%',
                        background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontSize: 14, fontWeight: 600, flexShrink: 0,
                      }}>
                        {t('groupChat.me', '我')}
                      </div>
                    )}
                  </div>
                )
              })}
              {!room && <div style={{ color: 'var(--text-secondary)', padding: 24, textAlign: 'center' }}>{t('groupChat.selectRoom', '请选择一个房间开始聊天')}</div>}
            </div>

            <div className="input-box">
              <div className="input-box__toolbar">
                <span className="toolbar__tip">{t('groupChat.toolbar.tip', 'Enter 发送 · 发送 @AI 你的问题 召唤 AI 回复')}</span>
                <span className="toolbar__count">{connected ? t('groupChat.toolbar.status', '实时') : t('groupChat.polling', '轮询')}</span>
              </div>
              <div className="input-box__row">
                <textarea
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={t('groupChat.placeholder', '输入消息，@AI 你的问题...')}
                />
                <button className="btn-send" disabled={loading || !draft.trim() || !roomId} onClick={handleSend}>↑</button>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
