import { useState, useRef, useCallback } from 'react'
import { useI18n } from '../hooks/useI18n'
import './InputBox.css'

export default function InputBox({ onSend, onAbort, loading, placeholder }) {
  const { t } = useI18n()
  const [text, setText]       = useState('')
  const [rows, setRows]       = useState(1)
  const textareaRef           = useRef()

  const handleSend = useCallback(() => {
    const trimmed = text.trim()
    if (!trimmed || loading) return
    onSend(trimmed)
    setText('')
    setRows(1)
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }, [text, loading, onSend])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleInput = (e) => {
    setText(e.target.value)
 // 自动撑高文本框
    const ta = e.target
    ta.style.height = 'auto'
    const newHeight = Math.min(ta.scrollHeight, 200)
    ta.style.height = newHeight + 'px'
    setRows(Math.ceil(newHeight / 24))
  }

  const isEmpty = !text.trim()

  return (
    <div className="input-box">
      {/* 工具栏 */}
      <div className="input-box__toolbar">
        <span className="toolbar__tip">
          {t('chat.toolbar.tip', 'Enter 发送 · Shift+Enter 换行')}
        </span>
        <span className="toolbar__count">
          {text.length} {t('chat.toolbar.count', '字')}
        </span>
      </div>

      {/* 输入区 */}
      <div className="input-box__row">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || '输入消息...'}
          disabled={loading}
          rows={1}
        />

        {/* 发送 / 中断 按钮 */}
        {loading ? (
          <button className="btn-abort" onClick={onAbort} title="中断">
            ⏹
          </button>
        ) : (
          <button
            className="btn-send"
            onClick={handleSend}
            disabled={isEmpty}
            title="发送 (Enter)"
          >
            ↑
          </button>
        )}
      </div>
    </div>
  )
}