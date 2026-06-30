const fs = require('fs')
const files = [
  'tmp-vohive-sms.js',
  'tmp-vohive-devices.js',
  'tmp-vohive-index.js',
]
const paths = new Set()
for (const file of files) {
  const s = fs.readFileSync(file, 'utf8')
  for (const m of s.matchAll(/\/(?:api|devices|proxy|sms|auth|logs|dashboard|settings|users|system)[a-zA-Z0-9_/${}.-]*/g)) {
    let p = m[0]
    p = p.replace(/\$\{[^}]+\}/g, '{id}')
    paths.add(p)
  }
}
console.log([...paths].sort().join('\n'))
