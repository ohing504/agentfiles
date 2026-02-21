import { createMiddleware } from '@tanstack/react-start'

let currentToken: string | null = null

export function setAuthToken(token: string): void {
  currentToken = token
}

export function getAuthToken(): string | null {
  return currentToken
}

export const authMiddleware = createMiddleware({ type: 'function' }).server(
  async ({ next, request }) => {
    const authHeader = request.headers.get('authorization')
    if (!validateBearerToken(authHeader)) {
      throw createAuthError()
    }
    return next()
  },
)

export function validateBearerToken(authHeader: string | null): boolean {
  if (!authHeader) return false
  if (!currentToken) return false
  const parts = authHeader.split(' ')
  if (parts.length !== 2 || parts[0] !== 'Bearer') return false
  return parts[1] === currentToken
}

export function createAuthError(): Response {
  return new Response(
    JSON.stringify({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }),
    {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    },
  )
}
