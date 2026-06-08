import { useI18n } from '../hooks/useI18n'

export default function LiveShareButton({ onClick, loading }) {
  const { t } = useI18n()
  return (
    <button className="action-btn" onClick={onClick} disabled={loading}>
      📡 {loading ? t('common.loading', '生成中...') : t('chat.liveShare', '实时共享当前对话')}
    </button>
  )
}
