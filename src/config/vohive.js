export {
  VOHIVE_PORT,
  DEFAULT_VOHIVE_PORT,
  normalizeVoHiveOrigin,
  resolveVoHiveBackend,
  getVoHiveUpstreamBase,
  resolveVoHiveUpstreamBase,
  getVoHiveApiBase,
  resolveVoHiveApiBase,
  shouldUseVoHiveProxy,
  getVoHiveHostLabel,
  resolveVoHiveProxyTarget,
  buildVoHiveUpstream,
} from '../stores/vohiveConnection'

export {
  normalizeVoHiveEndpoint,
  buildVoHiveUpstreamOrigin,
  buildVoHiveBaseUrl,
  detectVoHiveProtocol,
  parseVoHiveEndpointInput,
} from '../utils/vohiveEndpoint'
