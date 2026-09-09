const STORAGE_TOKEN = 'nexumservice_token'
const STORAGE_USER = 'nexumservice_user'

export function readSession() {
  const token = localStorage.getItem(STORAGE_TOKEN) || ''
  const user = JSON.parse(localStorage.getItem(STORAGE_USER) || 'null')
  return { token, user }
}

export function persistSession(nextToken, nextUser) {
  const token = nextToken || ''
  const user = nextUser || null
  localStorage.setItem(STORAGE_TOKEN, token)
  localStorage.setItem(STORAGE_USER, JSON.stringify(user))
  window.dispatchEvent(new CustomEvent('session:updated', { detail: { token, user } }))
}

export function clearSession() {
  localStorage.removeItem(STORAGE_TOKEN)
  localStorage.removeItem(STORAGE_USER)
  window.dispatchEvent(new CustomEvent('session:updated', { detail: { token: '', user: null } }))
}

export function getProfileRoute(role) {
  const normalized = (role || 'cliente').toLowerCase()
  return normalized === 'tecnico' ? '/perfil-tecnico' : '/perfil-cliente'
}
