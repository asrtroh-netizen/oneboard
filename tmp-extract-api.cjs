const fs = require('fs')
const s = fs.readFileSync('tmp-vohive-devices.js', 'utf8')
const re = /\/(?:api|devices)[a-zA-Z0-9_/${}.?=-]*/g
const set = new Set()
let m
while ((m = re.exec(s))) {
  let p = m[0].replace(/\$\{[^}]+\}/g, '{id}')
  if (p.length < 100) set.add(p)
}
console.log([...set].sort().join('\n'))
