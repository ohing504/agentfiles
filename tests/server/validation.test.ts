import { describe, expect, it } from 'vitest'
import { validateItemName } from '@/server/validation'

describe('validateItemName', () => {
  it('accepts valid names', () => {
    expect(() => validateItemName('my-agent')).not.toThrow()
    expect(() => validateItemName('my_command')).not.toThrow()
    expect(() => validateItemName('skill.v2')).not.toThrow()
  })

  it('rejects empty name', () => {
    expect(() => validateItemName('')).toThrow('Invalid item name')
  })

  it('rejects path traversal with ..', () => {
    expect(() => validateItemName('../etc/passwd')).toThrow('Invalid item name')
    expect(() => validateItemName('foo..bar')).toThrow('Invalid item name')
  })

  it('rejects forward slashes', () => {
    expect(() => validateItemName('foo/bar')).toThrow('Invalid item name')
  })

  it('rejects backslashes', () => {
    expect(() => validateItemName('foo\\bar')).toThrow('Invalid item name')
  })
})
