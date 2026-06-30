import { apiFetchJson } from './http'

export async function getOneBoardVersion() {
  return apiFetchJson('/api/version', {
    headers: { Accept: 'application/json' },
    trackLoading: false,
  })
}
