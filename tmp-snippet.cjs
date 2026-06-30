const fs = require('fs')
const s = fs.readFileSync('tmp-vohive-route-sms.js', 'utf8')
const idx = s.indexOf('auth/login')
console.log(s.slice(Math.max(0, idx - 200), idx + 400))
console.log('---')
const idx2 = s.indexOf('/devices')
let count = 0
let pos = 0
while ((pos = s.indexOf('/devices', pos)) !== -1 && count < 5) {
  console.log(s.slice(pos, pos + 120))
  pos += 8
  count++
}
