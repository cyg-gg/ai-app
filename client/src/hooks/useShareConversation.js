import { useState, useCallback } from 'react'
import { shareAPI } from '../api/share'

export function useShareConversation() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [shareUrl, setShareUrl] = useState('')

  const createShare = useCallback(async (sessionId, title, messages) => {
    setLoading(true)
    setError(null)
    try {
      const data = await shareAPI.createConversation(sessionId, title, messages)
      const absoluteUrl = data.shareUrl?.startsWith('http') ? data.shareUrl : `${window.location.origin}${data.shareUrl}`
      setShareUrl(absoluteUrl)
      return { ...data, shareUrl: absoluteUrl }
    } catch (e) {
      setError(e.message)
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  const copyShareUrl = useCallback(async (url = shareUrl) => {
    if (!url) return false
    await navigator.clipboard.writeText(url)
    return true
  }, [shareUrl])

  return { loading, error, shareUrl, createShare, copyShareUrl, setShareUrl }
}
