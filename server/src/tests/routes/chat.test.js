import { describe, it, expect, vi } from 'vitest'
import request from 'supertest'
import app     from '../../app.js'

vi.mock('../../chains/chat.js', () => ({
  chatStream: async () => ({
    stream: (async function* () { yield '模拟回答' })(),
    onComplete: async () => {},
  }),
  chat: async () => '模拟回答',
}))

describe('POST /api/chat', () => {
  it('正常对话返回 200', async () => {
    const res = await request(app)
      .post('/api/chat')
      .send({ message: '你好', sessionId: 'test-session' })

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('answer')
    expect(res.body).toHaveProperty('sessionId')
  })

  it('空消息返回 400', async () => {
    const res = await request(app)
      .post('/api/chat')
      .send({ message: '' })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('消息不能为空')
  })
})
