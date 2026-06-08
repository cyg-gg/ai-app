import { useI18n } from '../hooks/useI18n'
import './MessageList.css'

export default function MessageList({ messages = [], loading }) {
  const { t } = useI18n()
  return (
    <div className="msg-list">
      {messages.length === 0 && !loading && (
        <div className="msg-empty">
          <div className="msg-empty__icon"></div>
          <p>{t('chat.empty', '开始一段新的对话吧')}</p>
        </div>
      )}
      {messages.map((m, idx) => (
        <div key={m.id || idx} className={`msg ${m.role === 'user' ? 'msg--user' : 'msg--ai'} ${m.isError ? 'msg--error' : ''}`}>
          <div className="msg__avatar">{m.role === 'user' ? '🧑' : '🤖'}</div>
          <div className="msg__wrap">
            <div className="msg__bubble">
              <div className="msg__content">{m.content}</div>
            </div>
          </div>
        </div>
      ))}
      {loading && (
        <div className="typing"><span /><span /><span /></div>
      )}
    </div>
  )
}
