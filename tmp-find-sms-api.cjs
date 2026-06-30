const fs = require('fs')
const files = ['tmp-vohive-route-sms.js', 'tmp-vohive-devices.js']
const hits = new Set()
for (const file of files) {
  const s = fs.readFileSync(file, 'utf8')
  for (const m of s.matchAll(/[`'"](\/[^`'"]{0,160})[`'"]/g)) {
    const p = m[1].replace(/\$\{[^}]+\}/g, '{id}')
    if (/sms|message|contact|thread|inbox|conversation|phone/i.test(p)) hits.add(p)
  }
  for (const m of s.matchAll(/\.(?:get|post|patch|put|delete)\(`([^`]+)`/g)) {
    const p = m[1].replace(/\$\{[^}]+\}/g, '{id}')
    hits.add(p)
  }
  for (const m of s.matchAll(/path:\s*[`'"]([^`'"]+)[`'"]/g)) {
    hits.add(m[1].replace(/\$\{[^}]+\}/g, '{id}'))
  }
}
const out = [...hits].sort().join('\n')
fs.writeFileSync('tmp-sms-api-hits.txt', out)
console.log(out)
