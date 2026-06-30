const fs = require('fs')
const s = fs.readFileSync('tmp-vohive-route-sms.js', 'utf8')

const anchors = [
  'contact=', 'before_ts', 'fetchThread', 'loadMore', 'scrollTop',
  'device_id="all"', "device_id='all'", 'imsi', 'Os(', 'parseContact',
  'route.query', 'contactKey', 'peer:', 'hasMore', 'Q.value'
]

for (const term of anchors) {
  let idx = 0
  let count = 0
  while (count < 3) {
    const i = s.indexOf(term, idx)
    if (i < 0) break
    console.log('\n===', term, '@', i, '===')
    console.log(s.slice(Math.max(0, i - 120), Math.min(s.length, i + 320)).replace(/\s+/g, ' '))
    idx = i + term.length
    count++
  }
}
