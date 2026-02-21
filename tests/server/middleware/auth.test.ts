import { afterEach, describe, expect, it } from 'vitest'
import {
  createAuthError,
  getAuthToken,
  setAuthToken,
  validateBearerToken,
} from '@/server/middleware/auth'

afterEach(() => {
  setAuthToken('')
})

describe('setAuthToken / getAuthToken', () => {
  it('stores and retrieves the token', () => {
    setAuthToken('test-token-123')
    expect(getAuthToken()).toBe('test-token-123')
  })
})

describe('validateBearerToken', () => {
  it('returns false when authHeader is null', () => {
    setAuthToken('valid-token')
    expect(validateBearerToken(null)).toBe(false)
  })

  it('returns false when no current token is set', () => {
    setAuthToken('')
    expect(validateBearerToken('Bearer some-token')).toBe(false)
  })

  it('returns false for malformed header', () => {
    setAuthToken('valid-token')
    expect(validateBearerToken('valid-token')).toBe(false)
    expect(validateBearerToken('Basic valid-token')).toBe(false)
  })

  it('returns false for wrong token', () => {
    setAuthToken('correct-token')
    expect(validateBearerToken('Bearer wrong-token')).toBe(false)
  })

  it('returns true for correct Bearer token', () => {
    setAuthToken('correct-token')
    expect(validateBearerToken('Bearer correct-token')).toBe(true)
  })
})

describe('createAuthError', () => {
  it('returns a 401 Response', async () => {
    const res = createAuthError()
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Unauthorized')
    expect(body.code).toBe('AUTH_REQUIRED')
  })
})
