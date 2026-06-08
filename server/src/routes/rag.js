import { Router } from 'express'
import multer     from 'multer'
import path       from 'path'
import { mkdir }  from 'fs/promises'
import { fileURLToPath } from 'url'
import { ragQuery, ragStream } from '../chains/rag.js'
import { vectorStoreManager } from '../vectorstore/index.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const UPLOAD_DIR = path.resolve(__dirname, '../../uploads')

const router = Router()
const upload = multer({ dest: UPLOAD_DIR })

async function ensureUploadDir() {
  await mkdir(UPLOAD_DIR, { recursive: true })
}

// 上传文件建立知识库
router.post('/upload', async (req, res, next) => {
  await ensureUploadDir()
  upload.single('file')(req, res, async (err) => {
    if (err) {
      console.error('RAG upload multer failed:', err)
      return res.status(400).json({ error: `文件上传失败：${err.message}` })
    }

    try {
      const { storeName } = req.body
      const file = req.file
      if (!file) return res.status(400).json({ error: '请上传文件' })

      const ext = path.extname(file.originalname).slice(1).toLowerCase()
      const result = await vectorStoreManager.createFromFile(storeName || 'default', file.path, ext)

      res.json({
        success: true,
        store: storeName || 'default',
        fileName: file.originalname,
        chunks: result.documents.length,
        message: '知识库创建成功',
      })
    } catch (e) {
      console.error('RAG upload failed:', e)
      next(e)
    }
  })
})

// 从文本创建知识库
router.post('/texts', async (req, res, next) => {
  try {
    const { storeName, texts, metadatas } = req.body
    if (!texts?.length) return res.status(400).json({ error: '文本不能为空' })

    await vectorStoreManager.createFromTexts(storeName, texts, metadatas)
    res.json({ success: true, store: storeName })
  } catch (e) {
    next(e)
  }
})

// 从 URL 创建知识库
router.post('/url', async (req, res, next) => {
  try {
    const { storeName, url } = req.body
    if (!url) return res.status(400).json({ error: 'URL 不能为空' })

    await vectorStoreManager.createFromURL(storeName || 'default', url)
    res.json({ success: true, store: storeName, message: '知识库创建成功' })
  } catch (e) {
    next(e)
  }
})

// RAG 查询
router.post('/query', async (req, res, next) => {
  try {
    const { storeName, question } = req.body
    if (!question?.trim()) return res.status(400).json({ error: '问题不能为空' })

    const result = await ragQuery(storeName || 'default', question)
    res.json(result)
  } catch (e) {
    next(e)
  }
})

// RAG 流式查询
router.post('/stream', async (req, res, next) => {
  try {
    const { storeName, question } = req.body
    if (!question?.trim()) return res.status(400).json({ error: '问题不能为空' })

    res.setHeader('Content-Type',  'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection',    'keep-alive')

    const stream = await ragStream(storeName || 'default', question)
    for await (const chunk of stream) {
      res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`)
    }
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`)
    res.end()
  } catch (e) {
    res.write(`data: ${JSON.stringify({ error: e.message })}\n\n`)
    res.end()
  }
})

// 删除知识库
router.delete('/stores/:name', async (req, res, next) => {
  try {
    const { name } = req.params
    const deleted = await vectorStoreManager.deleteStore(name)
    if (!deleted) return res.status(404).json({ error: '知识库不存在' })
    res.json({ success: true, store: name })
  } catch (e) {
    next(e)
  }
})

// 列出知识库
router.get('/stores', (req, res) => {
  res.json({ stores: vectorStoreManager.listStores() })
})

export default router
