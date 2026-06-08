export default function ShareConversationButton({ onClick, loading }) {
  return (
    <button className="action-btn" onClick={onClick} disabled={loading}>
      🔗 {loading ? '生成中...' : '分享当前对话'}
    </button>
  )
}
