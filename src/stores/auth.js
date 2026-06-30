import { STORAGE_KEYS } from '../utils/storageKeys'

const TOKEN_KEY = STORAGE_KEYS.authToken
const USER_KEY = STORAGE_KEYS.authUser

export function getAuthToken() {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function getAuthUser() {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function setAuthSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token)
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  }
}

export function updateAuthUser(patch) {
  const user = getAuthUser()
  if (!user) return
  setAuthSession(getAuthToken(), { ...user, ...patch })
}

export function clearAuthSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export function isAuthenticated() {
  return Boolean(getAuthToken())
}

export function mustChangePassword() {
  return Boolean(getAuthUser()?.mustChangePassword)
}

export function authHeaders(extra = {}) {
  const token = getAuthToken()
  return {
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  }
}
