/** Semantic Visual — LOGO 层资产（品牌/语义锚点，与 BACKGROUND 分离） */

function svgUri(body) {
  return `data:image/svg+xml,${encodeURIComponent(body.trim())}`
}

const LOGO_SVGS = {
  apple: svgUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <defs>
        <linearGradient id="as" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#fafafa"/><stop offset="100%" stop-color="#a1a1aa"/>
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="14" fill="#141416"/>
      <path fill="url(#as)" d="M38 14c-1.5 9 5.5 13.5 5.5 13.5S50 24 48.5 14C47.5 9 42 6 36 6S30 9 29 14c-3-1-6.5 0-9 2.5 4.5 1 7 5 7.5 8.5 1 6-2 11.5-2 11.5s8-3 9.5-10c2.5 1 5.5 1 8 0-1 7.5 9.5 10.5 9.5 9.5-1.5 7-6 9-11.5-4 2-9 0-12-3.5z"/>
    </svg>
  `),
  google: svgUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <rect width="64" height="64" rx="14" fill="#0c1929"/>
      <text x="32" y="44" text-anchor="middle" font-family="Arial,sans-serif" font-size="36" font-weight="700">
        <tspan fill="#4285F4">G</tspan>
      </text>
      <circle cx="32" cy="32" r="22" fill="none" stroke="#4285F4" stroke-width="2" stroke-opacity="0.35"/>
      <path d="M32 10 A22 22 0 0 1 50 22" fill="none" stroke="#EA4335" stroke-width="3" stroke-linecap="round"/>
      <path d="M50 22 A22 22 0 0 1 50 42" fill="none" stroke="#FBBC05" stroke-width="3" stroke-linecap="round"/>
      <path d="M50 42 A22 22 0 0 1 32 54" fill="none" stroke="#34A853" stroke-width="3" stroke-linecap="round"/>
    </svg>
  `),
  microsoft: svgUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <rect width="64" height="64" rx="14" fill="#0f172a"/>
      <rect x="14" y="14" width="16" height="16" fill="#f25022"/><rect x="34" y="14" width="16" height="16" fill="#7fba00"/>
      <rect x="14" y="34" width="16" height="16" fill="#00a4ef"/><rect x="34" y="34" width="16" height="16" fill="#ffb900"/>
    </svg>
  `),
  meta: svgUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <rect width="64" height="64" rx="14" fill="#0c1a3a"/>
      <path fill="none" stroke="#60a5fa" stroke-width="5" stroke-linecap="round"
        d="M14 38 C14 24 22 18 32 28 C42 18 50 24 50 38 C50 48 42 52 32 42 C22 52 14 48 14 38 Z"/>
    </svg>
  `),
  ai: svgUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <defs><radialGradient id="ng" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#c4b5fd" stop-opacity="0.5"/><stop offset="100%" stop-color="#4338ca" stop-opacity="0"/>
      </radialGradient></defs>
      <rect width="64" height="64" rx="14" fill="#1e1b4b"/>
      <circle cx="32" cy="32" r="24" fill="url(#ng)"/>
      <g fill="none" stroke="#ddd6fe" stroke-width="1.8" stroke-opacity="0.75">
        <circle cx="20" cy="32" r="4" fill="#a78bfa"/><circle cx="44" cy="32" r="4" fill="#a78bfa"/>
        <circle cx="32" cy="18" r="4" fill="#c4b5fd"/><circle cx="32" cy="46" r="4" fill="#c4b5fd"/>
        <path d="M20 32 L32 18 L44 32 L32 46 Z"/>
      </g>
    </svg>
  `),
  github: svgUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <rect width="64" height="64" rx="14" fill="#0d1117"/>
      <path fill="#e6edf3" fill-opacity="0.88" d="M32 12c-11 0-20 9-20 20 0 8.8 5.7 16.2 13.7 18.8 1 .2 1.4-.4 1.4-.9 0-.4 0-1.7 0-3.3-5.5 1.2-6.7-2.7-6.7-2.7-.9-2.3-2.2-2.9-2.2-2.9-1.8-1.2.1-1.2.1-1.2 2 .1 3.1 2.1 3.1 2.1 1.8 3.1 4.7 2.2 5.9 1.7.2-1.3.7-2.2 1.3-2.7-4.5-.5-9.2-2.2-9.2-10 0-2.2.8-4 2.1-5.4-.2-.5-.9-2.6.2-5.4 0 0 1.7-.5 5.6 2.1 1.6-.5 3.4-.7 5.1-.7s3.5.2 5.1.7c3.9-2.6 5.6-2.1 5.6-2.1 1.1 2.8.4 4.9.2 5.4 1.3 1.4 2.1 3.2 2.1 5.4 0 7.8-4.7 9.5-9.2 10 .7.6 1.4 1.8 1.4 3.6 0 2.6 0 4.7 0 5.3 0 .5.4 1.1 1.4.9 8-2.6 13.7-10 13.7-18.8 0-11-9-20-20-20z"/>
    </svg>
  `),
  docker: svgUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <rect width="64" height="64" rx="14" fill="#0c4a6e"/>
      <g fill="#38bdf8">
        <rect x="10" y="30" width="10" height="8" rx="1"/><rect x="22" y="30" width="10" height="8" rx="1"/>
        <rect x="34" y="30" width="10" height="8" rx="1"/><rect x="22" y="20" width="10" height="8" rx="1"/>
        <rect x="34" y="20" width="10" height="8" rx="1"/>
      </g>
      <path fill="none" stroke="#7dd3fc" stroke-width="2" d="M46 34 Q54 28 58 34"/>
    </svg>
  `),
  api: svgUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <rect width="64" height="64" rx="14" fill="#0f172a"/>
      <text x="32" y="40" text-anchor="middle" fill="#2dd4bf" font-family="monospace" font-size="22" font-weight="700">&lt;/&gt;</text>
    </svg>
  `),
  direct: svgUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <rect width="64" height="64" rx="14" fill="#111827"/>
      <path fill="none" stroke="#94a3b8" stroke-width="3" stroke-linecap="round" d="M18 40 L32 22 L46 40"/>
      <line x1="32" y1="22" x2="32" y2="48" stroke="#64748b" stroke-width="2" stroke-opacity="0.5"/>
    </svg>
  `),
  proxy: svgUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <rect width="64" height="64" rx="14" fill="#2e1065"/>
      <circle cx="20" cy="32" r="6" fill="#a78bfa"/><circle cx="44" cy="32" r="6" fill="#c4b5fd"/>
      <path fill="none" stroke="#ddd6fe" stroke-width="2" d="M26 32 H38"/>
      <circle cx="32" cy="32" r="14" fill="none" stroke="#7c3aed" stroke-width="1.5" stroke-opacity="0.6"/>
    </svg>
  `),
  speed: svgUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <rect width="64" height="64" rx="14" fill="#042f2e"/>
      <path fill="none" stroke="#5eead4" stroke-width="3" stroke-linecap="round" d="M10 42 Q24 14 32 32 T54 20"/>
    </svg>
  `),
  ruleset: svgUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <rect width="64" height="64" rx="14" fill="#172554"/>
      <rect x="16" y="16" width="32" height="32" rx="6" fill="none" stroke="#60a5fa" stroke-width="2"/>
      <line x1="22" y1="26" x2="42" y2="26" stroke="#93c5fd" stroke-width="2"/><line x1="22" y1="32" x2="38" y2="32" stroke="#93c5fd" stroke-width="2"/>
      <line x1="22" y1="38" x2="34" y2="38" stroke="#93c5fd" stroke-width="2"/>
    </svg>
  `),
  security: svgUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <rect width="64" height="64" rx="14" fill="#450a0a"/>
      <path fill="none" stroke="#fca5a5" stroke-width="2.5"
        d="M32 14 L46 22 V34 C46 44 32 50 32 50 C32 50 18 44 18 34 V22 Z"/>
      <circle cx="32" cy="34" r="6" fill="none" stroke="#f87171" stroke-width="2"/>
    </svg>
  `),
  privacy: svgUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <rect width="64" height="64" rx="14" fill="#042f2e"/>
      <path fill="none" stroke="#5eead4" stroke-width="2.5"
        d="M32 12 L48 20 V34 C48 44 32 52 32 52 C32 52 16 44 16 34 V20 Z"/>
      <path fill="none" stroke="#99f6e4" stroke-width="2" d="M26 34 L30 38 L38 28"/>
    </svg>
  `),
  adblock: svgUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <rect width="64" height="64" rx="14" fill="#431407"/>
      <polygon points="32,14 48,24 48,40 32,50 16,40 16,24" fill="none" stroke="#fb923c" stroke-width="2"/>
      <line x1="22" y1="22" x2="42" y2="42" stroke="#fdba74" stroke-width="3"/><line x1="42" y1="22" x2="22" y2="42" stroke="#fdba74" stroke-width="3"/>
    </svg>
  `),
  xiaohongshu: svgUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <rect width="64" height="64" rx="14" fill="#ff2442"/>
      <text x="32" y="26" text-anchor="middle" fill="#ffffff" font-family="PingFang SC,Microsoft YaHei,sans-serif" font-size="14" font-weight="700">小红</text>
      <text x="32" y="44" text-anchor="middle" fill="#ffffff" font-family="PingFang SC,Microsoft YaHei,sans-serif" font-size="14" font-weight="700">书</text>
    </svg>
  `),
  douyin: svgUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <rect width="64" height="64" rx="14" fill="#0a0a0a"/>
      <path fill="#25f4ee" d="M38 14v22c0 4.4-3.6 8-8 8s-8-3.6-8-8 3.6-8 8-8V18c-6.6 0-12 5.4-12 12s5.4 12 12 12 12-5.4 12-12V14h8z"/>
      <path fill="#fe2c55" d="M42 14v8c3.3 0 6 2.7 6 6h-6v14c0 6.6-5.4 12-12 12v-8c2.2 0 4-1.8 4-4V28h6c0-7.7-6.3-14-14-14v8c-2.2 0-4 1.8-4 4s1.8 4 4 4V14h8z" fill-opacity="0.85"/>
    </svg>
  `),
  youtube: svgUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <rect width="64" height="64" rx="14" fill="#0f0f0f"/>
      <rect x="12" y="20" width="40" height="24" rx="8" fill="#ff0000"/>
      <path fill="#ffffff" d="M28 26 L44 32 28 38 Z"/>
    </svg>
  `),
  netflix: svgUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <rect width="64" height="64" rx="14" fill="#141414"/>
      <path fill="#e50914" d="M18 48 L28 16 L34 48 Z"/>
      <path fill="#e50914" d="M34 48 L44 16 L50 48 Z"/>
    </svg>
  `),
  telegram: svgUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <rect width="64" height="64" rx="14" fill="#229ed9"/>
      <path fill="#ffffff" d="M14 32 L50 18 42 46 28 36 22 42 24 34 Z" fill-opacity="0.95"/>
      <path fill="#ffffff" d="M28 36 L40 26" stroke="#229ed9" stroke-width="2"/>
    </svg>
  `),
  game: svgUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <rect width="64" height="64" rx="14" fill="#1a0533"/>
      <rect x="14" y="22" width="36" height="20" rx="8" fill="none" stroke="#f0abfc" stroke-width="2"/>
      <circle cx="24" cy="32" r="4" fill="#f0abfc"/><circle cx="40" cy="28" r="2.5" fill="#67e8f9"/><circle cx="44" cy="36" r="2.5" fill="#fde047"/>
    </svg>
  `),
  global: svgUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <rect width="64" height="64" rx="14" fill="#0f172a"/>
      <circle cx="32" cy="32" r="20" fill="none" stroke="#60a5fa" stroke-width="2.5"/>
      <ellipse cx="32" cy="32" rx="8" ry="20" fill="none" stroke="#60a5fa" stroke-width="1.8" stroke-opacity="0.7"/>
      <line x1="12" y1="32" x2="52" y2="32" stroke="#60a5fa" stroke-width="1.8" stroke-opacity="0.55"/>
    </svg>
  `),
}

export function logoForTheme(theme) {
  return LOGO_SVGS[theme] || LOGO_SVGS.global
}

export { LOGO_SVGS }
