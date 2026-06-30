import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..')

export function getOnebordVersionInfo() {
  return getOneBoardVersionInfo()
}

export function getOneBoardVersionInfo() {
  const pkg = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf8'))
  return {
    name: pkg.name || 'oneboard',
    version: String(pkg.version || '1.1'),
    status: 'running',
  }
}
