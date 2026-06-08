import { MemoryVectorStore } from '@langchain/classic/vectorstores/memory'
import { RecursiveCharacterTextSplitter } from '@langchain/classic/text_splitter'
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf'
import { CheerioWebBaseLoader } from '@langchain/community/document_loaders/web/cheerio'
import { mkdir, readFile, writeFile } from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { getEmbeddings } from '../models/llm.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DATA_DIR = path.resolve(__dirname, '../../data')
const REGISTRY_PATH = path.join(DATA_DIR, 'rag-stores.json')

async function ensureDataDir() {
  await mkdir(DATA_DIR, { recursive: true })
}

function normalizeDocuments(docs) {
  return docs.map(doc => ({
    pageContent: doc.pageContent,
    metadata: doc.metadata || {},
  }))
}

class VectorStoreManager {
  constructor() {
    this.stores = new Map()
    this.registry = new Map()
    this.embeddings = getEmbeddings()
    this.splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 800,
      chunkOverlap: 150,
      separators: ['\n\n', '\n', '。', '！', '？', '…', ' ', ''],
    })
    this.ready = this.loadRegistry()
  }

  async loadRegistry() {
    await ensureDataDir()
    try {
      const raw = await readFile(REGISTRY_PATH, 'utf8')
      const data = JSON.parse(raw)
      this.registry = new Map(Object.entries(data || {}))
    } catch {
      this.registry = new Map()
    }

    for (const [name, entry] of this.registry.entries()) {
      if (entry?.documents?.length) {
        const store = await MemoryVectorStore.fromDocuments(entry.documents, this.embeddings)
        this.stores.set(name, store)
      }
    }
  }

  async saveRegistry() {
    await ensureDataDir()
    const payload = Object.fromEntries(this.registry.entries())
    await writeFile(REGISTRY_PATH, JSON.stringify(payload, null, 2), 'utf8')
  }

  async persistStore(name, documents, sourceType) {
    this.registry.set(name, {
      sourceType,
      updatedAt: new Date().toISOString(),
      createdAt: this.registry.get(name)?.createdAt || new Date().toISOString(),
      documents: normalizeDocuments(documents),
    })
    await this.saveRegistry()
  }

  async createStore(name, documents, sourceType) {
    const store = await MemoryVectorStore.fromDocuments(documents, this.embeddings)
    this.stores.set(name, store)
    await this.persistStore(name, documents, sourceType)
    return { store, documents }
  }

  async createFromTexts(name, texts, metadatas = []) {
    await this.ready
    const documents = texts.map((text, i) => ({
      pageContent: text,
      metadata: metadatas[i] || {},
    }))
    const store = await this.createStore(name, documents, 'texts')
    console.log(`✅ 知识库 [${name}] 创建成功，共 ${texts.length} 条`)
    return store
  }

  async createFromFile(name, filePath, fileType = 'pdf') {
    await this.ready
    let loader
    const resolvedPath = path.resolve(filePath)

    if (fileType === 'pdf') {
      loader = new PDFLoader(resolvedPath)
    } else {
      throw new Error(`暂不支持 ${fileType} 类型`)
    }

    let rawDocs
    try {
      rawDocs = await loader.load()
    } catch (error) {
      throw new Error(`PDF 解析失败：${error.message}`)
    }

    if (!rawDocs?.length) {
      throw new Error('未能从文件中解析出内容，请确认文件是否为有效 PDF')
    }

    const docs = await this.splitter.splitDocuments(rawDocs)
    if (!docs?.length) {
      throw new Error('文件内容为空，无法创建知识库')
    }

    try {
      const store = await this.createStore(name, docs, `file:${fileType}`)
      console.log(`✅ 知识库 [${name}] 创建成功，共 ${docs.length} 个片段`)
      return store
    } catch (error) {
      throw new Error(`知识库存储失败：${error.message}`)
    }
  }

  async createFromURL(name, url) {
    await this.ready
    const loader = new CheerioWebBaseLoader(url)
    const rawDocs = await loader.load()
    const docs = await this.splitter.splitDocuments(rawDocs)
    const store = await this.createStore(name, docs, 'url')
    console.log(`✅ 知识库 [${name}] 创建成功，共 ${docs.length} 个片段`)
    return store
  }

  async addDocuments(name, texts, metadatas = []) {
    await this.ready
    const store = this.stores.get(name)
    if (!store) throw new Error(`知识库 [${name}] 不存在`)
    const documents = texts.map((text, i) => ({ pageContent: text, metadata: metadatas[i] || {} }))
    await store.addDocuments(documents)
    const existing = this.registry.get(name)
    const merged = existing?.documents ? [...existing.documents, ...normalizeDocuments(documents)] : normalizeDocuments(documents)
    await this.persistStore(name, merged, existing?.sourceType || 'texts')
  }

  async search(name, query, k = 4) {
    await this.ready
    const store = this.stores.get(name)
    if (!store) return []
    return store.similaritySearchWithScore(query, k)
  }

  async deleteStore(name) {
    await this.ready
    const existed = this.stores.delete(name)
    const removed = this.registry.delete(name)
    if (removed) await this.saveRegistry()
    return existed || removed
  }

  getRetriever(name, k = 4) {
    const store = this.stores.get(name)
    if (!store) throw new Error(`知识库 [${name}] 不存在`)
    return store.asRetriever({ k })
  }

  listStores() {
    return Array.from(this.registry.keys())
  }
}

export const vectorStoreManager = new VectorStoreManager()
