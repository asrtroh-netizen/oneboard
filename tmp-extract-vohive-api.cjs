const fs = require('fs')
const files = [
  'tmp-vohive-route-sms.js',
  'tmp-vohive-devices.js',
  'tmp-vohive-shell.js',
  'tmp-vohive-index.js',
]
const paths = new Set()
for (const file of files) {
  try {
    const s = fs.readFileSync(file, 'utf8')
    for (const m of s.matchAll(/["'`](\/(?:api\/)?[a-z][a-z0-9_/${}.-]{2,80})["'`]/g)) {
      paths.add(m[1].replace(/\$\{[^}]+\}/g, '{id}'))
    }
    for (const m of s.matchAll(/path:\s*[`'"]([^`'"]+)[`'"]/g)) {
      paths.add(m[1].replace(/\$\{[^}]+\}/g, '{id}'))
    }
    for (const m of s.matchAll(/url:\s*[`'"]([^`'"]+)[`'"]/g)) {
      paths.add(m[1].replace(/\$\{[^}]+\}/g, '{id}'))
    }
  } catch {}
}
console.log([...paths].sort().join('\n'))
