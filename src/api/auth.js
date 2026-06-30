import { authHeaders, clearAuthSession, getAuthToken } from '../stores/auth'
import { apiFetch, apiFetchJson } from './http'

export async function login(username, password) {
  const data = await apiFetchJson('/api/login', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password }),
  })
  return data
}

export async function logout() {
  try {
    await apiFetch('/api/logout', {
      method: 'POST',
      headers: authHeaders(),
      trackLoading: false,
    })
  } catch {
    /* 离线时仍清除本地会话 */
  } finally {
    clearAuthSession()
  }
}

export async function changePassword({ newPassword, confirmPassword, currentPassword }) {
  const data = await apiFetchJson('/api/change-password', {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ newPassword, confirmPassword, currentPassword }),
  })
  return data
}

export function hasAuthToken() {
  return Boolean(getAuthToken())
}
