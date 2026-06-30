/**
 * OpenWrt Full Release entry — full console (UI + API + WS + agent).
 * Docker Full Release uses `server/gateway.js` via `npm start`.
 */
if (!process.env.ONEBORD_RUNTIME) process.env.ONEBORD_RUNTIME = 'openwrt'
if (!process.env.ONEBORD_PORT) process.env.ONEBORD_PORT = '18080'
if (!process.env.ONEBORD_HOST) process.env.ONEBORD_HOST = '0.0.0.0'

await import('./gateway.js')
