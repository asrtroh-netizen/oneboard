/**
 * Generate ruleBlocks JSON from config.yaml (rules section only).
 * Usage: node scripts/build-rule-blocks.mjs [path/to/config.yaml]
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildRuleBlocksFromRawLines } from '../src/utils/ruleBlocks.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const defaultConfig = path.resolve(
  'C:/Users/Administrator/Desktop/2026年度报告_分页面/config.yaml',
)
const configPath = process.argv[2] ? path.resolve(process.argv[2]) : defaultConfig
const outPath = path.resolve(__dirname, '../src/data/ruleBlocksLayout.json')

function extractRulesSection(yaml) {
  const lines = yaml.split(/\r?\n/)
  const rulesLines = []
  let inRules = false

  for (const line of lines) {
    if (!inRules) {
      if (/^rules:\s*$/.test(line)) {
        inRules = true
      }
      continue
    }

    if (/^[a-zA-Z0-9_-]+:/.test(line) && !line.startsWith(' ')) {
      break
    }

    if (line.trim().startsWith('-')) {
      rulesLines.push(line)
    }
  }

  return rulesLines
}

const yaml = fs.readFileSync(configPath, 'utf8')
const ruleLines = extractRulesSection(yaml)
const layout = buildRuleBlocksFromRawLines(ruleLines)

const payload = {
  source: path.basename(configPath),
  generatedAt: new Date().toISOString(),
  ruleCount: ruleLines.length,
  ...layout,
}

fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')

console.log(`Wrote ${layout.blocks.length} blocks / ${ruleLines.length} rules → ${outPath}`)
for (const block of layout.blocks) {
  console.log(`  · ${block.name}: ${block.rules.length}`)
}
