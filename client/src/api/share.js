const BASE = ''

async function request(path, options = {}) {
  const res = await fetch(`${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    credentials: 'include',
    ...options,
  })

  const text = await res.text().catch(() => '')
  let data = {}
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = { raw: text }
    }
  }

  if (!res.ok) throw new Error(data.error || data.message || `请求失败 ${res.status}`)
  return data
}

export const shareAPI = {
  createConversation: (sessionId, title, messages) => request('/api/share/conversation', { method: 'POST', body: JSON.stringify({ sessionId, title, messages }) }),
  getConversation: (token) => request(`/api/share/conversation/${token}`),
  deleteConversation: (token) => request(`/api/share/conversation/${token}`, { method: 'DELETE' }),
}
