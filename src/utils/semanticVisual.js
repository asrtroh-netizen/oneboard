import { getFlagAssetPath, hasFlagAsset, normalizeCountryCode } from './countryRegistry'
import { guessCountryCode } from './countryNodes'
import { logoForTheme } from './semanticLogos'

function svgUri(body) {
  return `data:image/svg+xml,${encodeURIComponent(body.trim())}`
}

/** @typedef {'country'|'bigtech'|'ai'|'dev'|'network'|'security'|'default'} SemanticCategory */

const THEME_SVGS = {
  apple: svgUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480">
      <defs>
        <linearGradient id="a" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0a0a0c"/><stop offset="45%" stop-color="#1a1a1f"/><stop offset="100%" stop-color="#2d2d34"/>
        </linearGradient>
        <radialGradient id="g" cx="78%" cy="22%" r="55%">
          <stop offset="0%" stop-color="#f5f5f7" stop-opacity="0.14"/><stop offset="100%" stop-color="#f5f5f7" stop-opacity="0"/>
        </radialGradient>
        <linearGradient id="shine" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.06"/><stop offset="40%" stop-color="#ffffff" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <rect width="640" height="480" fill="url(#a)"/>
      <rect width="640" height="480" fill="url(#g)"/>
      <rect width="640" height="480" fill="url(#shine)"/>
    </svg>
  `),
  google: svgUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#0a1628"/><stop offset="100%" stop-color="#1e3a5f"/>
        </linearGradient>
        <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
          <path d="M 32 0 L 0 0 0 32" fill="none" stroke="#4285F4" stroke-opacity="0.18" stroke-width="1"/>
        </pattern>
        <radialGradient id="gl" cx="70%" cy="30%" r="50%">
          <stop offset="0%" stop-color="#4285F4" stop-opacity="0.2"/><stop offset="100%" stop-color="#4285F4" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="640" height="480" fill="url(#bg)"/>
      <rect width="640" height="480" fill="url(#grid)"/>
      <rect width="640" height="480" fill="url(#gl)"/>
    </svg>
  `),
  microsoft: svgUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480">
      <defs><linearGradient id="ms" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#0f172a"/><stop offset="100%" stop-color="#1e3a8a"/>
      </linearGradient></defs>
      <rect width="640" height="480" fill="url(#ms)"/>
      <rect x="180" y="140" width="88" height="88" fill="#0078d4" fill-opacity="0.72"/>
      <rect x="280" y="140" width="88" height="88" fill="#50a0ff" fill-opacity="0.62"/>
      <rect x="180" y="240" width="88" height="88" fill="#ffb900" fill-opacity="0.58"/>
      <rect x="280" y="240" width="88" height="88" fill="#00a4ef" fill-opacity="0.65"/>
    </svg>
  `),
  meta: svgUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480">
      <defs><linearGradient id="mt" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0c1a3a"/><stop offset="50%" stop-color="#1d4ed8"/><stop offset="100%" stop-color="#312e81"/>
      </linearGradient></defs>
      <rect width="640" height="480" fill="url(#mt)"/>
      <path fill="none" stroke="#60a5fa" stroke-width="14" stroke-opacity="0.55"
        d="M160 280 C160 180 240 120 320 200 C400 120 480 180 480 280 C480 360 400 380 320 300 C240 380 160 360 160 280 Z"/>
    </svg>
  `),
  ai: svgUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480">
      <defs>
        <linearGradient id="ai" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#1e1b4b"/><stop offset="45%" stop-color="#4338ca"/><stop offset="100%" stop-color="#7c3aed"/>
        </linearGradient>
        <radialGradient id="glow" cx="50%" cy="40%" r="50%">
          <stop offset="0%" stop-color="#c4b5fd" stop-opacity="0.35"/><stop offset="100%" stop-color="#c4b5fd" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="640" height="480" fill="url(#ai)"/><rect width="640" height="480" fill="url(#glow)"/>
      <g fill="none" stroke="#ddd6fe" stroke-opacity="0.5" stroke-width="1.5">
        <circle cx="160" cy="240" r="7"/><circle cx="320" cy="140" r="7"/>
        <circle cx="480" cy="240" r="7"/><circle cx="320" cy="340" r="7"/>
        <path d="M160 240 L320 140 L480 240 L320 340 Z"/>
      </g>
    </svg>
  `),
  github: svgUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480">
      <defs>
        <linearGradient id="gh" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#0d1117"/><stop offset="100%" stop-color="#161b22"/>
        </linearGradient>
        <pattern id="dots" width="24" height="24" patternUnits="userSpaceOnUse">
          <circle cx="4" cy="4" r="1.5" fill="#58a6ff" fill-opacity="0.35"/>
        </pattern>
      </defs>
      <rect width="640" height="480" fill="url(#gh)"/><rect width="640" height="480" fill="url(#dots)"/>
      <path fill="#f0f6fc" fill-opacity="0.12" d="M320 120c-88 0-160 71-160 160 0 70 46 130 110 152 8 1 11-3 11-8v-28c-45 10-54-22-54-22-7-18-18-23-18-23-15-10 1-10 1-10 16 1 25 17 25 17 15 25 39 18 48 14 1-11 6-18 11-22-39-4-79-19-79-86 0-19 7-35 18-47-2-4-8-22 2-46 0 0 15-5 49 18 14-4 29-6 44-6s30 2 44 6c34-23 49-18 49-18 10 24 4 42 2 46 11 12 18 28 18 47 0 67-41 82-80 86 6 5 12 15 12 31v46c0 5 3 9 11 8 64-22 110-82 110-152 0-89-72-160-160-160z"/>
    </svg>
  `),
  docker: svgUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480">
      <defs><linearGradient id="dk" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0c4a6e"/><stop offset="100%" stop-color="#0369a1"/>
      </linearGradient></defs>
      <rect width="640" height="480" fill="url(#dk)"/>
      <g fill="#38bdf8" fill-opacity="0.55">
        <rect x="140" y="220" width="48" height="36" rx="4"/><rect x="196" y="220" width="48" height="36" rx="4"/>
        <rect x="252" y="220" width="48" height="36" rx="4"/><rect x="196" y="176" width="48" height="36" rx="4"/>
        <rect x="308" y="176" width="48" height="36" rx="4"/>
      </g>
      <path fill="none" stroke="#7dd3fc" stroke-width="3" stroke-opacity="0.45"
        d="M360 256 Q440 180 540 200 Q580 280 480 320 Q360 360 280 300"/>
    </svg>
  `),
  api: svgUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480">
      <defs>
        <linearGradient id="ap" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#0f172a"/><stop offset="100%" stop-color="#134e4a"/>
        </linearGradient>
        <pattern id="circuit" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M0 20 H16 M24 20 H40 M20 0 V16 M20 24 V40" stroke="#2dd4bf" stroke-opacity="0.25" fill="none"/>
        </pattern>
      </defs>
      <rect width="640" height="480" fill="url(#ap)"/><rect width="640" height="480" fill="url(#circuit)"/>
      <text x="320" y="250" text-anchor="middle" fill="#5eead4" fill-opacity="0.35" font-family="monospace" font-size="72" font-weight="700">&lt;/&gt;</text>
    </svg>
  `),
  direct: svgUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480">
      <defs>
        <pattern id="grid" width="28" height="28" patternUnits="userSpaceOnUse">
          <path d="M 28 0 L 0 0 0 28" fill="none" stroke="#64748b" stroke-opacity="0.32" stroke-width="1"/>
        </pattern>
        <linearGradient id="d" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#111827"/><stop offset="100%" stop-color="#1f2937"/>
        </linearGradient>
      </defs>
      <rect width="640" height="480" fill="url(#d)"/><rect width="640" height="480" fill="url(#grid)"/>
      <path fill="none" stroke="#94a3b8" stroke-width="3" stroke-opacity="0.4" d="M120 320 L320 160 L520 320"/>
    </svg>
  `),
  proxy: svgUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480">
      <defs>
        <linearGradient id="p" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#2e1065"/><stop offset="100%" stop-color="#7c3aed"/>
        </linearGradient>
        <radialGradient id="pg" cx="30%" cy="70%" r="60%">
          <stop offset="0%" stop-color="#a78bfa" stop-opacity="0.42"/><stop offset="100%" stop-color="#a78bfa" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="640" height="480" fill="url(#p)"/><rect width="640" height="480" fill="url(#pg)"/>
      <path fill="none" stroke="#ddd6fe" stroke-opacity="0.45" stroke-width="3" d="M120 360 Q200 120 320 240 T520 120"/>
      <circle cx="320" cy="240" r="56" fill="none" stroke="#c4b5fd" stroke-opacity="0.35" stroke-width="2"/>
    </svg>
  `),
  speed: svgUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480">
      <defs>
        <linearGradient id="sp" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#042f2e"/><stop offset="100%" stop-color="#0f766e"/>
        </linearGradient>
      </defs>
      <rect width="640" height="480" fill="url(#sp)"/>
      <path fill="none" stroke="#5eead4" stroke-opacity="0.5" stroke-width="4"
        d="M40 320 Q160 80 320 240 T600 160"/>
      <path fill="none" stroke="#99f6e4" stroke-opacity="0.28" stroke-width="8"
        d="M40 360 Q180 120 340 280 T620 200"/>
    </svg>
  `),
  ruleset: svgUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480">
      <defs>
        <linearGradient id="rs" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#172554"/><stop offset="100%" stop-color="#1e1b4b"/>
        </linearGradient>
        <pattern id="hex" width="36" height="32" patternUnits="userSpaceOnUse" patternTransform="scale(1.2)">
          <path d="M18 2 L34 10 L34 26 L18 34 L2 26 L2 10 Z" fill="none" stroke="#60a5fa" stroke-opacity="0.18"/>
        </pattern>
      </defs>
      <rect width="640" height="480" fill="url(#rs)"/><rect width="640" height="480" fill="url(#hex)"/>
      <rect x="220" y="160" width="200" height="160" rx="12" fill="none" stroke="#93c5fd" stroke-opacity="0.45" stroke-width="2"/>
    </svg>
  `),
  security: svgUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480">
      <defs>
        <linearGradient id="sc" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#450a0a"/><stop offset="100%" stop-color="#7f1d1d"/>
        </linearGradient>
        <radialGradient id="pulse" cx="50%" cy="45%" r="45%">
          <stop offset="0%" stop-color="#ef4444" stop-opacity="0.35"/><stop offset="100%" stop-color="#ef4444" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="640" height="480" fill="url(#sc)"/><rect width="640" height="480" fill="url(#pulse)"/>
      <path fill="none" stroke="#fca5a5" stroke-width="3" stroke-opacity="0.55"
        d="M320 100 L420 150 V250 C420 320 320 360 320 360 C320 360 220 320 220 250 V150 Z"/>
    </svg>
  `),
  privacy: svgUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480">
      <defs><linearGradient id="pv" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#042f2e"/><stop offset="100%" stop-color="#115e59"/>
      </linearGradient></defs>
      <rect width="640" height="480" fill="url(#pv)"/>
      <path fill="none" stroke="#5eead4" stroke-width="3" stroke-opacity="0.5"
        d="M320 90 L440 150 V260 C440 340 320 390 320 390 C320 390 200 340 200 260 V150 Z"/>
      <circle cx="320" cy="240" r="36" fill="#14b8a6" fill-opacity="0.15"/>
    </svg>
  `),
  adblock: svgUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480">
      <defs><linearGradient id="ab" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#431407"/><stop offset="100%" stop-color="#9a3412"/>
      </linearGradient></defs>
      <rect width="640" height="480" fill="url(#ab)"/>
      <polygon points="320,110 420,160 420,280 320,360 220,280 220,160" fill="none" stroke="#fb923c" stroke-width="3" stroke-opacity="0.55"/>
      <line x1="260" y1="180" x2="380" y2="300" stroke="#fdba74" stroke-width="4" stroke-opacity="0.65"/>
      <line x1="380" y1="180" x2="260" y2="300" stroke="#fdba74" stroke-width="4" stroke-opacity="0.65"/>
    </svg>
  `),
  xiaohongshu: svgUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480">
      <defs>
        <linearGradient id="xhs" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#ff4d6d"/><stop offset="45%" stop-color="#ff2442"/><stop offset="100%" stop-color="#c81e3a"/>
        </linearGradient>
        <radialGradient id="xhg" cx="72%" cy="28%" r="55%">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.18"/><stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
        </radialGradient>
        <pattern id="xhd" width="24" height="24" patternUnits="userSpaceOnUse">
          <circle cx="6" cy="6" r="1.2" fill="#ffffff" fill-opacity="0.12"/>
        </pattern>
      </defs>
      <rect width="640" height="480" fill="url(#xhs)"/>
      <rect width="640" height="480" fill="url(#xhd)"/>
      <rect width="640" height="480" fill="url(#xhg)"/>
      <path fill="#ffffff" fill-opacity="0.06" d="M80 360 Q320 80 560 360 L560 480 L80 480 Z"/>
    </svg>
  `),
  douyin: svgUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480">
      <defs>
        <linearGradient id="dy" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#050505"/><stop offset="55%" stop-color="#111827"/><stop offset="100%" stop-color="#1f2937"/>
        </linearGradient>
        <radialGradient id="dyg" cx="28%" cy="72%" r="50%">
          <stop offset="0%" stop-color="#25f4ee" stop-opacity="0.22"/><stop offset="100%" stop-color="#25f4ee" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="dyp" cx="78%" cy="22%" r="45%">
          <stop offset="0%" stop-color="#fe2c55" stop-opacity="0.28"/><stop offset="100%" stop-color="#fe2c55" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="640" height="480" fill="url(#dy)"/>
      <rect width="640" height="480" fill="url(#dyg)"/>
      <rect width="640" height="480" fill="url(#dyp)"/>
      <path fill="none" stroke="#25f4ee" stroke-opacity="0.35" stroke-width="2"
        d="M120 340 Q240 120 360 260 T520 140"/>
      <path fill="none" stroke="#fe2c55" stroke-opacity="0.28" stroke-width="2"
        d="M160 380 Q300 180 420 300 T580 200"/>
    </svg>
  `),
  youtube: svgUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480">
      <defs>
        <linearGradient id="yt" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#450a0a"/><stop offset="100%" stop-color="#991b1b"/>
        </linearGradient>
        <radialGradient id="ytg" cx="50%" cy="40%" r="55%">
          <stop offset="0%" stop-color="#ff0000" stop-opacity="0.35"/><stop offset="100%" stop-color="#ff0000" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="640" height="480" fill="url(#yt)"/><rect width="640" height="480" fill="url(#ytg)"/>
      <rect x="200" y="170" width="240" height="140" rx="28" fill="#ff0000" fill-opacity="0.35"/>
    </svg>
  `),
  netflix: svgUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480">
      <defs>
        <linearGradient id="nf" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0a0a0a"/><stop offset="100%" stop-color="#1a0505"/>
        </linearGradient>
        <radialGradient id="nfg" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stop-color="#e50914" stop-opacity="0.42"/><stop offset="100%" stop-color="#e50914" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="640" height="480" fill="url(#nf)"/><rect width="640" height="480" fill="url(#nfg)"/>
      <path fill="#e50914" fill-opacity="0.22" d="M260 120 L420 120 L340 360 Z"/>
    </svg>
  `),
  telegram: svgUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480">
      <defs>
        <linearGradient id="tg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0c4a6e"/><stop offset="100%" stop-color="#0369a1"/>
        </linearGradient>
        <radialGradient id="tgg" cx="30%" cy="30%" r="55%">
          <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.35"/><stop offset="100%" stop-color="#38bdf8" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="640" height="480" fill="url(#tg)"/><rect width="640" height="480" fill="url(#tgg)"/>
      <circle cx="320" cy="240" r="120" fill="#229ed9" fill-opacity="0.18"/>
    </svg>
  `),
  game: svgUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480">
      <defs>
        <linearGradient id="gm" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#1a0533"/><stop offset="50%" stop-color="#4c1d95"/><stop offset="100%" stop-color="#be185d"/>
        </linearGradient>
      </defs>
      <rect width="640" height="480" fill="url(#gm)"/>
      <rect x="180" y="160" width="280" height="160" rx="24" fill="none" stroke="#f0abfc" stroke-opacity="0.4" stroke-width="4"/>
      <circle cx="260" cy="240" r="16" fill="#f0abfc" fill-opacity="0.55"/>
    </svg>
  `),
  global: svgUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480">
      <defs>
        <linearGradient id="gb" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#0f172a"/><stop offset="100%" stop-color="#1e293b"/>
        </linearGradient>
        <radialGradient id="gl" cx="65%" cy="40%" r="55%">
          <stop offset="0%" stop-color="#60a5fa" stop-opacity="0.22"/><stop offset="100%" stop-color="#60a5fa" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="640" height="480" fill="url(#gb)"/><rect width="640" height="480" fill="url(#gl)"/>
      <circle cx="320" cy="240" r="110" fill="none" stroke="#60a5fa" stroke-width="7" stroke-opacity="0.55"/>
      <ellipse cx="320" cy="240" rx="44" ry="110" fill="none" stroke="#60a5fa" stroke-width="5" stroke-opacity="0.45"/>
      <line x1="210" y1="240" x2="430" y2="240" stroke="#60a5fa" stroke-width="5" stroke-opacity="0.35"/>
    </svg>
  `),
}

/** @type {Record<string, SemanticCategory>} */
const THEME_CATEGORY = {
  apple: 'bigtech',
  google: 'bigtech',
  microsoft: 'bigtech',
  meta: 'bigtech',
  ai: 'ai',
  github: 'dev',
  docker: 'dev',
  api: 'dev',
  direct: 'network',
  proxy: 'network',
  speed: 'network',
  ruleset: 'network',
  security: 'security',
  privacy: 'security',
  adblock: 'security',
  xiaohongshu: 'default',
  douyin: 'default',
  youtube: 'default',
  netflix: 'default',
  telegram: 'default',
  game: 'default',
  global: 'default',
}

/** @type {Array<{ key: keyof typeof THEME_SVGS, category: SemanticCategory, patterns: RegExp[] }>} */
const KEYWORD_THEMES = [
  { key: 'adblock', category: 'security', patterns: [/adblock/i, /广告拦截/, /去广告/, /\bad[\s-]?block/i] },
  { key: 'privacy', category: 'security', patterns: [/privacy/i, /隐私/, /tracking/i, /追踪/] },
  { key: 'security', category: 'security', patterns: [/hijack/i, /劫持/, /shield/i, /安全/, /malware/i, /phishing/i] },
  { key: 'xiaohongshu', category: 'default', patterns: [/小红书/, /xiaohongshu/i, /xhscdn/i, /\bxhs\b/i] },
  { key: 'douyin', category: 'default', patterns: [/抖音/, /douyin/i, /字节跳动/, /bytedance/i, /iesdouyin/i, /amemv/i] },
  { key: 'apple', category: 'bigtech', patterns: [/apple/i, /苹果/, /icloud/i, /itunes/i, /AppleAI/i, /AppleNews/i, /🍎/] },
  { key: 'google', category: 'bigtech', patterns: [/google/i, /谷歌/, /android/i] },
  { key: 'youtube', category: 'default', patterns: [/youtube/i, /油管/, /YouTube/i] },
  { key: 'netflix', category: 'default', patterns: [/netflix/i, /奈飞/, /网飞/] },
  { key: 'telegram', category: 'default', patterns: [/telegram/i, /电报/, /TikTok/i, /tiktok/i] },
  { key: 'microsoft', category: 'bigtech', patterns: [/microsoft/i, /微软/, /azure/i, /office/i, /windows/i] },
  { key: 'meta', category: 'bigtech', patterns: [/meta/i, /facebook/i, /instagram/i, /whatsapp/i, /messenger/i] },
  { key: 'ai', category: 'ai', patterns: [/\bAI\b/i, /openai/i, /claude/i, /\bgpt\b/i, /deepseek/i, /gemini/i, /copilot/i, /llm/i, /chatgpt/i] },
  { key: 'github', category: 'dev', patterns: [/github/i, /gitlab/i, /\bgit\b/i] },
  { key: 'docker', category: 'dev', patterns: [/docker/i, /container/i, /k8s/i, /kubernetes/i] },
  { key: 'api', category: 'dev', patterns: [/\bapi\b/i, /graphql/i, /restful/i, /developer/i, /\bdev\b/i] },
  { key: 'ruleset', category: 'network', patterns: [/rule-set/i, /ruleset/i, /RULE-SET/i, /规则集/] },
  { key: 'speed', category: 'network', patterns: [/speedtest/i, /speed/i, /fast/i, /测速/, /延迟/, /latency/i] },
  { key: 'proxy', category: 'network', patterns: [/proxy/i, /代理/, /wifi/i, /节点/, /分流/, /vpn/i, /tunnel/i] },
  { key: 'direct', category: 'network', patterns: [/\bdirect\b/i, /直连/, /禁止\s*QUIC/i, /\breject\b/i, /拒绝/, /\bDIRECT\b/] },
  { key: 'game', category: 'default', patterns: [/game/i, /gaming/i, /游戏/, /steam/i, /xbox/i, /playstation/i] },
]

function detectKeywordTheme(text) {
  for (const entry of KEYWORD_THEMES) {
    if (entry.patterns.some((p) => p.test(text))) return entry
  }
  return null
}

function themeImage(theme) {
  return THEME_SVGS[theme] || THEME_SVGS.global
}

/**
 * @returns {{
 *   kind: 'flag'|'semantic',
 *   category: SemanticCategory,
 *   logo: string,
 *   background: string,
 *   image: string,
 *   thumb: string,
 *   theme: string,
 * }}
 */
export function resolveSemanticVisual(code = '', label = '', context = '') {
  const name = String(label || '').trim()
  const blockContext = String(context || '').trim()
  let resolvedCode = normalizeCountryCode(code)

  if (!hasFlagAsset(resolvedCode) && name) {
    const guessed = guessCountryCode(name, code)
    if (hasFlagAsset(guessed)) resolvedCode = guessed
  }

  if (hasFlagAsset(resolvedCode)) {
    const flagUrl = getFlagAssetPath(resolvedCode)
    return {
      kind: 'flag',
      category: 'country',
      logo: flagUrl,
      background: flagUrl,
      image: flagUrl,
      thumb: flagUrl,
      theme: resolvedCode.toLowerCase(),
    }
  }

  const haystack = `${name} ${resolvedCode} ${blockContext}`.trim()
  const matched = detectKeywordTheme(haystack)
  const theme = matched?.key || 'global'
  const category = matched?.category || THEME_CATEGORY[theme] || 'default'
  const background = themeImage(theme)
  const logo = logoForTheme(theme)

  return {
    kind: 'semantic',
    category,
    logo,
    background,
    image: background,
    thumb: logo,
    theme,
  }
}

/** @deprecated use resolveSemanticVisual */
export function resolveGroupBackground(groupName = '', blockName = '') {
  return resolveSemanticVisual('', groupName, blockName)
}

export { THEME_SVGS, THEME_CATEGORY, KEYWORD_THEMES }
