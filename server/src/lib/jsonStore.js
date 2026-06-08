import { promises as fs } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.resolve(__dirname, '..', '..', 'data')

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true })
}

export async function readJsonFile(fileName, fallback = null) {
  try {
    await ensureDir()
    const raw = await fs.readFile(path.join(DATA_DIR, fileName), 'utf8')
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

export async function writeJsonFile(fileName, data) {
  await ensureDir()
  await fs.writeFile(path.join(DATA_DIR, fileName), JSON.stringify(data, null, 2), 'utf8')
}
