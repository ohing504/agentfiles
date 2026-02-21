export function extractTokenFromUrl(): string | null {
  if (typeof window === "undefined") return null
  const params = new URLSearchParams(window.location.search)
  return params.get("token")
}

export function storeToken(token: string): void {
  localStorage.setItem("agentfiles-token", token)
}

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem("agentfiles-token")
}

export function clearUrlToken(): void {
  const url = new URL(window.location.href)
  url.searchParams.delete("token")
  window.history.replaceState({}, "", url.toString())
}

export function initAuth(): void {
  const urlToken = extractTokenFromUrl()
  if (urlToken) {
    storeToken(urlToken)
    clearUrlToken()
  }
}

export function getAuthHeaders(): Record<string, string> {
  const token = getStoredToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}
