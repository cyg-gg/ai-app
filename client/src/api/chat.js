const BASE = ''

// ── 通用请求封装 ──
async function request(path, options = {}) {
  const res = await fetch(`${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || data.message || `请求失败 ${res.status}`)
  return data
}

// ── 对话 ──
export const chatAPI = {
  // 普通对话
  send: (message, sessionId, liveRoomId) =>
    request('/api/chat', {
      method: 'POST',
      body:   JSON.stringify({ message, sessionId, liveRoomId }),
    }),

  // 流式对话（返回 AsyncGenerator）
  async *stream(message, sessionId, liveRoomId) {
    const res = await fetch(`/api/chat/stream`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body:    JSON.stringify({ message, sessionId, liveRoomId }),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || '流式请求失败')
    }
    yield* parseSSE(res.body)
  },

  // 获取历史
  getHistory:   (sessionId) => request(`/api/chat/history/${sessionId}`),

  // 清除会话
  clearSession: (sessionId) => request(`/api/chat/session/${sessionId}`, { method: 'DELETE' }),

  // 会话列表
  listSessions: () => request('/api/chat/sessions'),
}

// ── RAG ──
export const ragAPI = {
  // 文本建库
  createFromTexts: (storeName, texts, metadatas) =>
    request('/api/rag/texts', {
      method: 'POST',
      body:   JSON.stringify({ storeName, texts, metadatas }),
    }),

  // URL 建库
  createFromURL: (storeName, url) =>
    request('/api/rag/url', {
      method: 'POST',
      body:   JSON.stringify({ storeName, url }),
    }),

  // 上传文件建库
  uploadFile: async (storeName, file) => {
    const form = new FormData()
    form.append('file', file)
    form.append('storeName', storeName)

    const res = await fetch(`${BASE}/api/rag/upload`, { method: 'POST', body: form })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || '上传失败')
    return data
  },

  // 普通问答
  query: (storeName, question) =>
    request('/api/rag/query', {
      method: 'POST',
      body:   JSON.stringify({ storeName, question }),
    }),

  // 流式问答
  async *stream(storeName, question) {
    const res = await fetch(`${BASE}/api/rag/stream`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body:    JSON.stringify({ storeName, question }),
    })
    yield* parseSSE(res.body)
  },

  // 知识库列表
  listStores: () => request('/api/rag/stores'),
}

// ── Agent ──
export const agentAPI = {
  run: (input) =>
    request('/api/agent', {
      method: 'POST',
      body:   JSON.stringify({ input }),
    }),

  async *stream(input) {
    const res = await fetch(`${BASE}/api/agent/stream`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body:    JSON.stringify({ input }),
    })
    yield* parseSSE(res.body)
  },
}

// ── 统计 ──
export const statsAPI = {
  get: () => request('/api/stats'),
}

// ── SSE 通用解析器 ──
async function* parseSSE(body) {
  const reader  = body.getReader()
  const decoder = new TextDecoder()
  let   buffer  = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) {
      // 处理缓冲区剩余数据
      if (buffer.trim()) {
        const lines = buffer.split('\n')
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()
          if (data === '[DONE]') return
          if (data) {
            try { yield JSON.parse(data) } catch (e) { console.warn('SSE 解析失败:', data) }
          }
        }
      }
      break
    }

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop()   // 保留不完整的最后一行

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6).trim()
      // 处理 [DONE] 标记
      if (data === '[DONE]') return
      if (data) {
        try { yield JSON.parse(data) } catch (e) { console.warn('SSE 解析失败:', data) }
      }
    }
  }
}