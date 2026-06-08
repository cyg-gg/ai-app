import { useI18n } from '../hooks/useI18n'

export default function ShareModal({ open, url, onCopy, onClose }) {
  const { t } = useI18n()
  if (!open) return null

  return (
    <div className="share-modal">
      <div className="theme-menu" style={{ width: 380 }}>
        <div className="theme-menu__header">
          <strong>{t('share.title', '分享成功')}</strong>
          <button className="theme-menu__close" onClick={onClose} aria-label={t('share.close', '关闭')}>×</button>
        </div>
        <div className="theme-menu__section">
          <div className="theme-menu__label">{t('share.title', '分享链接')}</div>
          <div className="theme-menu__value" style={{ wordBreak: 'break-all', fontSize: 13, lineHeight: 1.5 }}>{url}</div>
          <div className="theme-menu__hint">{t('share.description', '打开后可查看只读版本的对话内容')}</div>
        </div>
        <div className="theme-menu__buttons" style={{ gridTemplateColumns: '1fr' }}>
          <button onClick={onCopy}>{t('share.copyLink', '复制链接')}</button>
        </div>
      </div>
    </div>
  )
}
