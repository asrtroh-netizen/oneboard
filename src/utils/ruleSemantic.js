/**
 * Rules 语义分组 — 全站统一 BANK 模式（BLOCK → GROUP → STRATEGY）
 */

const VOWIFI_RE = [
  /\bepdg\b/i,
  /\bss\.epdg\b/i,
  /\bsos\.epdg\b/i,
  /^ss\./i,
  /\bwlan\./i,
  /3gppnetwork/i,
  /ondemandconnectivity/i,
  /\bims\.mnc/i,
  /\bims\./i,
  /entsrv-/i,
  /device\.three\./i,
  /csl\.prod/i,
  /hhk\.prod/i,
  /vuk-gto/i,
  /giffgaff/i,
  /voxi\.co/i,
  /telekom\.de/i,
  /t-mobile\.de/i,
  /vodafone/i,
  /o2online/i,
  /telefonica\.de/i,
  /eplus\.de/i,
  /1und1\.de/i,
  /1u1\.de/i,
  /arcor-ip/i,
  /att\.net/i,
  /att-idns/i,
]

const BANKING_RE = [
  /\bbank\b/i,
  /hsbc/i,
  /hangseng/i,
  /bochk/i,
  /hkbea/i,
  /\bsc\.com/i,
  /citibank/i,
  /citi\.com/i,
  /dbs\.com/i,
  /icbc/i,
  /\bccb\b/i,
  /ocbc/i,
  /dahsing/i,
  /welab/i,
  /fusionbank/i,
  /\bmox\.com/i,
  /za\.group/i,
  /lloyds/i,
  /barclays/i,
  /natwest/i,
  /deutsche-bank/i,
  /commerzbank/i,
  /sparkasse/i,
  /\bn26\b/i,
  /revolut/i,
  /monzo/i,
  /starling/i,
  /chase\.com/i,
  /paypal/i,
  /stripe/i,
  /americanexpress/i,
  /amex/i,
  /venmo/i,
  /cash\.app/i,
]

const AI_RE = [
  /\bAI\b/i,
  /openai/i,
  /claude/i,
  /\bgpt\b/i,
  /deepseek/i,
  /gemini/i,
  /anthropic/i,
  /copilot/i,
  /midjourney/i,
  /appleai/i,
  /applenews/i,
]

const CDN_RE = [
  /\bcdn\b/i,
  /xhscdn/i,
  /byteimg/i,
  /static\./i,
  /assets\./i,
  /cloudfront/i,
  /akamai/i,
  /fastly/i,
]

const DIRECT_RE = [
  /douyin/i,
  /xiaohongshu/i,
  /snssdk/i,
  /amemv/i,
  /ixigua/i,
  /iesdouyin/i,
  /flowus/i,
  /shimo/i,
  /geosite/i,
  /geoip/i,
  /cn\b/i,
  /直连/i,
  /全球直连/i,
]

const SPEED_RE = [/speedtest/i, /测速/i, /latency/i]

const ADS_RE = [/advertis/i, /privacy/i, /hijack/i, /广告/i, /拦截/i]

const MEDIA_RE = [/emby/i, /wuguimovie/i, /movie/i, /📽/]

const BUCKET_ORDER = [
  'vowifi',
  'banking',
  'ai',
  'cdn',
  'direct',
  'speed',
  'proxy',
  'ads',
  'media',
  'network',
  'policy',
  'fallback',
]

const BUCKET_DEFS = {
  vowifi: {
    label: 'VoWiFi',
    emoji: '📱',
    title: 'VoWiFi / 运营商',
    hint: 'IMS · ePDG · SS · WLAN 聚合',
    hiddenByDefault: false,
  },
  banking: {
    label: 'Banking',
    emoji: '🏦',
    title: 'Banking / 金融',
    hint: '银行与支付域名聚合',
    hiddenByDefault: false,
  },
  ai: {
    label: 'AI',
    emoji: '🤖',
    title: 'AI / 大模型',
    hint: 'Apple AI · OpenAI · 模型服务',
    hiddenByDefault: false,
  },
  cdn: {
    label: 'CDN',
    emoji: '📦',
    title: 'CDN / 静态资源',
    hint: 'CDN 与静态分发域名',
    hiddenByDefault: false,
  },
  direct: {
    label: 'Direct',
    emoji: '🎯',
    title: 'Direct / 直连',
    hint: '国内直连与 GEOSITE 策略',
    hiddenByDefault: false,
  },
  speed: {
    label: 'Speed',
    emoji: '⚡',
    title: 'Speed / 测速',
    hint: 'Speedtest 与测速节点',
    hiddenByDefault: false,
  },
  proxy: {
    label: 'Proxy',
    emoji: '🔀',
    title: 'Proxy / 代理分流',
    hint: 'RULE-SET 与代理组策略',
    hiddenByDefault: false,
  },
  ads: {
    label: 'Ads Block',
    emoji: '🛑',
    title: 'Ads / 拦截',
    hint: '广告 · 隐私 · 劫持拦截',
    hiddenByDefault: false,
  },
  media: {
    label: 'Media',
    emoji: '📽',
    title: 'Media / 媒体',
    hint: 'Emby 等媒体服务',
    hiddenByDefault: false,
  },
  network: {
    label: 'Network',
    emoji: '🛡',
    title: 'Network / 网络优化',
    hint: 'QUIC 阻断 · 组合规则',
    hiddenByDefault: false,
  },
  policy: {
    label: 'Policy',
    emoji: '📋',
    title: 'Policy / 其他策略',
    hint: '补充策略规则聚合',
    hiddenByDefault: false,
  },
  fallback: {
    label: 'Fallback',
    emoji: '🌐',
    title: 'Fallback / Network',
    hint: 'IP-CIDR 回落路由',
    hiddenByDefault: true,
  },
}

function rulePayload(rule) {
  return String(rule?.payload ?? rule?.name ?? '').trim()
}

function ruleType(rule) {
  return String(rule?.type ?? rule?.matchMode ?? '').toUpperCase()
}

function ruleOutbound(rule) {
  return String(rule?.proxy ?? rule?.outboundTarget ?? rule?.outbound ?? '').trim()
}

export function classifySemanticRule(rule) {
  const payload = rulePayload(rule)
  const type = ruleType(rule)
  const outbound = ruleOutbound(rule)
  const haystack = `${payload} ${outbound}`

  if (type === 'IP-CIDR' || type === 'IP-CIDR6') return 'fallback'

  if (type === 'AND' || type === 'OR' || outbound.toUpperCase() === 'REJECT') {
    return 'network'
  }

  if (VOWIFI_RE.some((re) => re.test(haystack))) return 'vowifi'
  if (/^(epdg|ss\.|wlan\.|sos\.)/i.test(payload) || payload.includes('3gppnetwork')) {
    return 'vowifi'
  }

  if (BANKING_RE.some((re) => re.test(haystack))) return 'banking'

  if (type === 'RULE-SET') {
    if (AI_RE.some((re) => re.test(payload))) return 'ai'
    if (SPEED_RE.some((re) => re.test(payload))) return 'speed'
    if (ADS_RE.some((re) => re.test(payload))) return 'ads'
    if (CDN_RE.some((re) => re.test(payload))) return 'cdn'
    return 'proxy'
  }

  if (AI_RE.some((re) => re.test(haystack))) return 'ai'
  if (SPEED_RE.some((re) => re.test(haystack))) return 'speed'
  if (ADS_RE.some((re) => re.test(haystack))) return 'ads'
  if (MEDIA_RE.some((re) => re.test(haystack))) return 'media'

  if (
    outbound.toUpperCase() === 'DIRECT'
    || outbound.includes('直连')
    || outbound.includes('全球直连')
    || type === 'GEOSITE'
    || type === 'GEOIP'
    || DIRECT_RE.some((re) => re.test(haystack))
  ) {
    return 'direct'
  }

  if (CDN_RE.some((re) => re.test(haystack))) return 'cdn'

  if (type === 'MATCH') return 'policy'

  if (outbound && outbound !== 'DIRECT' && outbound !== 'REJECT') return 'proxy'

  return 'policy'
}

function buildBucketMeta(id, rules) {
  const def = BUCKET_DEFS[id] || BUCKET_DEFS.policy
  const count = rules.length
  const outbound = rules[0]?.outboundTarget || rules[0]?.proxy || '—'

  let description = `${count} 条策略规则`
  if (id === 'fallback') description = `${count} 段 IP-CIDR 回落`
  else if (id === 'network') description = `${count} 条网络层策略`
  else if (id === 'vowifi') description = `${count} 条运营商 VoWiFi 策略`
  else if (id === 'banking') description = `${count} 条金融域名策略`
  else if (id === 'direct') description = `${count} 条直连策略`
  else if (id === 'ai') description = `${count} 条 AI 分流策略`
  else if (id === 'proxy') description = `${count} 条代理 RULE-SET`

  return {
    id,
    label: def.label,
    emoji: def.emoji,
    title: def.title,
    description,
    hint: def.hint,
    count,
    outbound,
    defaultOpen: false,
    hiddenByDefault: def.hiddenByDefault,
  }
}

/** @returns {Array} */
export function buildSemanticBuckets(rules = []) {
  const map = Object.fromEntries(BUCKET_ORDER.map((id) => [id, []]))

  for (const rule of rules) {
    const cat = classifySemanticRule(rule)
    if (map[cat]) map[cat].push(rule)
    else map.policy.push(rule)
  }

  return BUCKET_ORDER
    .filter((id) => map[id].length > 0)
    .map((id) => ({
      ...buildBucketMeta(id, map[id]),
      rules: map[id],
    }))
}

/** 全站统一 BANK 模式 — 始终用语义分组 */
export function shouldUseSemanticGrouping() {
  return true
}
