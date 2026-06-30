const fs = require('fs')
const s = fs.readFileSync('tmp-vohive-route-sms.js', 'utf8')
// find function de and surrounding
const idx = s.indexOf('function de()')
console.log(s.slice(idx, idx + 1500))
console.log('\n--- ot function ---\n')
const idx2 = s.indexOf('async function ot(')
console.log(s.slice(idx2, idx2 + 2000))
