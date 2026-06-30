const fs = require('fs')
const s = fs.readFileSync('tmp-vohive-shell.js', 'utf8')
for (const word of ['proxy', 'rotate', 'logs', 'settings', 'traffic', 'dashboard']) {
  const re = new RegExp(`["'\`]([^"'\`]*${word}[^"'\`]*)["'\`]`, 'gi')
  const found = new Set()
  for (const m of s.matchAll(re)) found.add(m[1])
  if (found.size) {
    console.log(`\n## ${word}`)
    console.log([...found].sort().join('\n'))
  }
}
