const fs = require('fs')
const s = fs.readFileSync('tmp-vohive-route-sms.js', 'utf8')
for (const term of ['timestamp', 'content', 'body', 'peer', 'device_id', 'local_phone', 'direction', 'inbound', 'outbound', 'message_id', 'sms_id']) {
  let idx = 0, c = 0
  while (c < 2) {
    const i = s.indexOf(term, idx)
    if (i < 0) break
    if (i > 8000 && i < 20000) {
      console.log('\n===', term, '@', i, '===')
      console.log(s.slice(Math.max(0, i - 80), Math.min(s.length, i + 120)).replace(/\s+/g, ' '))
    }
    idx = i + term.length
    c++
  }
}
