// 简单的并发控制队列
export class AsyncQueue {
  constructor(concurrency = 3) {
    this.concurrency = concurrency
    this.running     = 0
    this.queue       = []
  }

  async add(fn) {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject })
      this.run()
    })
  }

  async run() {
    if (this.running >= this.concurrency || !this.queue.length) return

    this.running++
    const { fn, resolve, reject } = this.queue.shift()

    try {
      resolve(await fn())
    } catch (e) {
      reject(e)
    } finally {
      this.running--
      this.run()
    }
  }
}

// 全局 LLM 请求队列，最多 3 个并发
export const llmQueue = new AsyncQueue(3)