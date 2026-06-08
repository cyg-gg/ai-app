import { useState, useCallback } from 'react'
import { ragAPI } from '../api/chat'
import { v4 as uuid } from 'uuid'

export function useRAG() {
  const [stores,    setStores]    = useState([])
  const [messages,  setMessages]  = useState([])
  const [loading,   setLoading]   = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error,     setError]     = useState(null)

  // 加载知识库列表
  const loadStores = useCallback(async () => {
    const { stores } = await ragAPI.listStores()
    setStores(stores)
  }, [])

  // 上传文件
  const uploadFile = useCallback(async (storeName, file) => {
    setUploading(true)
    setError(null)
    try {
      await ragAPI.uploadFile(storeName, file)
      await loadStores()
      return true
    } catch (e) {
      setError(e.message)
      return false
    } finally {
      setUploading(false)
    }
  }, [loadStores])

  // 从 URL 建库
  const addFromURL = useCallback(async (storeName, url) => {
    setUploading(true)
    try {
      await ragAPI.createFromURL(storeName, url)
      await loadStores()
    } catch (e) {
      setError(e.message)
    } finally {
      setUploading(false)
    }
  }, [loadStores])

  // 流式问答
  const query = useCallback(async (storeName, question) => {
    if (!question.trim() || loading) return

    const userMsg = { id: uuid(), role: 'user',      content: question, ts: Date.now() }
    const aiMsg   = { id: uuid(), role: 'assistant', content: '',       ts: Date.now(), sources: [] }

    setMessages(prev => [...prev, userMsg, aiMsg])
    setLoading(true)
    setError(null)

    try {
      for await (const data of ragAPI.stream(storeName, question)) {
        if (data.error) throw new Error(data.error)
        if (data.done)  break
        if (data.content) {
          setMessages(prev =>
            prev.map(m =>
              m.id === aiMsg.id
                ? { ...m, content: m.content + data.content }
                : m
            )
          )
        }
      }

      // 用完整答案替换流式片段，同时获取来源
      const { answer, sources } = await ragAPI.query(storeName, question)
      setMessages(prev =>
        prev.map(m => m.id === aiMsg.id ? { ...m, content: answer, sources } : m)
      )
    } catch (e) {
      setError(e.message)
      setMessages(prev =>
        prev.map(m =>
          m.id === aiMsg.id
            ? { ...m, content: `❌ ${e.message}`, isError: true }
            : m
        )
      )
    } finally {
      setLoading(false)
    }
  }, [loading])

  return {
    stores,
    messages,
    loading,
    uploading,
    error,
    loadStores,
    uploadFile,
    addFromURL,
    query,
  }
}
