import { useState, useEffect, useRef } from 'react'
import { useRAG }      from '../hooks/useRAG'
import { useI18n }     from '../hooks/useI18n'
import MessageList     from './MessageList'
import InputBox        from './InputBox'
import './RAGPanel.css'

export default function RAGPanel() {
  const { t } = useI18n()
  const {
    stores, messages, loading, uploading, error,
    loadStores, uploadFile, addFromURL, query,
  } = useRAG()

  const [activeStore, setActiveStore] = useState('')
  const [urlInput,    setUrlInput]    = useState('')
  const [storeName,   setStoreName]   = useState('default')
  const [tab,         setTab]         = useState('chat')  // chat | manage
  const fileRef = useRef()

  useEffect(() => { loadStores() }, [])
  useEffect(() => { if (stores.length && !activeStore) setActiveStore(stores[0]) }, [stores])

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !storeName) return
    try {
      const result = await uploadFile(storeName, file)
      if (result?.success) {
        alert(`✅ ${t('rag.uploadSuccess', '文件')} ${result.fileName || file.name} ${t('rag.uploadedTo', '已加入知识库')} [${result.store}]，${t('rag.chunks', '共')} ${result.chunks || 0} ${t('rag.fragments', '个片段')}`)
      }
    } catch (error) {
      alert(`❌ ${t('rag.uploadFailed', '上传失败')}：${error.message}`)
    } finally {
      e.target.value = ''
    }
  }

  const handleURL = async () => {
    if (!urlInput.trim() || !storeName) return
    await addFromURL(storeName, urlInput.trim())
    setUrlInput('')
    alert(`✅ ${t('rag.urlAdded', '网页已加入知识库')} [${storeName}]`)
  }

  return (
    <div className="rag-panel">
      {/* Tab 切换 */}
      <div className="rag-tabs">
        <button
          className={tab === 'chat'   ? 'active' : ''}
          onClick={() => setTab('chat')}
        > {t('rag.qaTab', '知识问答')}</button>
        <button
          className={tab === 'manage' ? 'active' : ''}
          onClick={() => setTab('manage')}
        >📂 {t('rag.manageTab', '知识库管理')}</button>
      </div>

      {tab === 'chat' ? (
        <div className="rag-chat">
          {/* 知识库选择 */}
          <div className="rag-store-bar">
            <span className="store-bar__label">📚 {t('rag.currentStore', '当前知识库')}</span>
            <select
              value={activeStore}
              onChange={e => setActiveStore(e.target.value)}
              className="store-select"
            >
              {stores.length === 0 && <option value="">{t('rag.noStores', '暂无知识库')}</option>}
              {stores.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <button
              className="btn-refresh"
              onClick={loadStores}
              title={t('rag.refreshList', '刷新列表')}
            >🔄</button>
          </div>

          {error && <div className="rag-error">⚠️ {error}</div>}

          <MessageList messages={messages} loading={loading} />
          <InputBox
            onSend={(q) => query(activeStore, q)}
            loading={loading}
            placeholder={t('rag.placeholder', `在 [${activeStore || '默认'}] 知识库中提问...`)}
          />
        </div>
      ) : (
        <div className="rag-manage">
          <h3>{t('rag.addContent', '添加知识库内容')}</h3>

          {/* 知识库名称 */}
          <div className="form-group">
            <label>{t('rag.storeName', '知识库名称')}</label>
            <input
              value={storeName}
              onChange={e => setStoreName(e.target.value)}
              placeholder="default"
            />
          </div>

          {/* 上传文件 */}
          <div className="upload-card">
            <div className="upload-card__icon">📄</div>
            <div className="upload-card__info">
              <strong>{t('rag.uploadFile', '上传文件')}</strong>
              <span>{t('rag.supportPdf', '支持 PDF 格式')}</span>
            </div>
            <button
              className="btn-upload"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? t('rag.processing', '处理中...') : t('rag.selectFile', '选择文件')}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf"
              style={{ display: 'none' }}
              onChange={handleFile}
            />
          </div>

          {/* 添加 URL */}
          <div className="url-card">
            <div className="url-card__icon">🌐</div>
            <div className="url-card__body">
              <strong>{t('rag.importFromUrl', '从网页导入')}</strong>
              <input
                value={urlInput}
                onChange={e => setUrlInput(e.target.value)}
                placeholder="https://example.com/article"
              />
            </div>
            <button
              className="btn-add-url"
              onClick={handleURL}
              disabled={uploading || !urlInput.trim()}
            >
              {uploading ? t('rag.importing', '导入中...') : t('rag.import', '导入')}
            </button>
          </div>

          {/* 已有知识库列表 */}
          <div className="store-list">
            <h4>{t('rag.createdStores', '已创建的知识库')} ({stores.length})</h4>
            {stores.length === 0
              ? <p className="empty-tip">{t('rag.noStoresYet', '暂无知识库，请先添加内容')}</p>
              : stores.map(s => (
                  <div key={s} className="store-item">
                    <span className="store-item__icon">📚</span>
                    <span className="store-item__name">{s}</span>
                    <button
                      className="store-item__use"
                      onClick={() => { setActiveStore(s); setTab('chat') }}
                    >{t('rag.use', '使用')}</button>
                  </div>
                ))
            }
          </div>
        </div>
      )}
    </div>
  )
}
