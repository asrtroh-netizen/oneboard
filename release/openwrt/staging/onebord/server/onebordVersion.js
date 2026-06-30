import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..')

export function getOnebordVersionInfo() {
  const pkg = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf8'))
  return {
    name: pkg.name || 'onebord',
    version: String(pkg.version || '0.0.0'),
    status: 'running',
  }
}
