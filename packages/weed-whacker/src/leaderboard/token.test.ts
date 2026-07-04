import { describe, expect, it } from 'vitest'
import {
  base64UrlDecode,
  base64UrlEncode,
  hmacHex,
  mintToken,
  parseToken,
  verifyToken,
} from './token'

const SECRET = 'test-secret'
const NOW = 1_751_600_000_000

describe('base64url round trip', () => {
  it('encodes and decodes arbitrary bytes', () => {
    const bytes = new Uint8Array([0, 1, 62, 63, 127, 128, 255])
    expect(base64UrlDecode(base64UrlEncode(bytes))).toEqual(bytes)
  })

  it('rejects non-alphabet input', () => {
    expect(base64UrlDecode('abc+def')).toBeNull()
    expect(base64UrlDecode('abc/def')).toBeNull()
    expect(base64UrlDecode('abc=')).toBeNull()
    expect(base64UrlDecode('a b')).toBeNull()
  })
})

describe('parseToken', () => {
  it('parses a minted token', async () => {
    const token = await mintToken(SECRET, NOW)
    const parsed = parseToken(token)
    expect(parsed).not.toBeNull()
    expect(parsed!.issuedAtMs).toBe(NOW)
    expect(parsed!.nonce).toMatch(/^[0-9a-f]{32}$/)
  })

  it('rejects malformed tokens', () => {
    expect(parseToken('')).toBeNull()
    expect(parseToken('not-a-token')).toBeNull()
    expect(parseToken('a.b.c')).toBeNull()
    expect(parseToken(42)).toBeNull()
    expect(parseToken('x'.repeat(300))).toBeNull()
  })

  it('rejects payloads that break the fixed field format', () => {
    const sig = base64UrlEncode(new Uint8Array(32))
    const bad = (payload: string) =>
      parseToken(`${base64UrlEncode(new TextEncoder().encode(payload))}.${sig}`)
    expect(bad('abc.00000000000000000000000000000000')).toBeNull()
    expect(bad(`${NOW}.tooshort`)).toBeNull()
    expect(bad(`${NOW}.${'0'.repeat(33)}`)).toBeNull()
    expect(bad(`${NOW}.${'0'.repeat(32)}.extra`)).toBeNull()
    expect(bad(`${NOW}.${'A'.repeat(32)}`)).toBeNull()
  })

  it('rejects signatures that are not 32 bytes', async () => {
    const token = await mintToken(SECRET, NOW)
    const [payload] = token.split('.')
    const shortSig = base64UrlEncode(new Uint8Array(16))
    expect(parseToken(`${payload}.${shortSig}`)).toBeNull()
  })
})

describe('verifyToken', () => {
  it('accepts a token minted with the same secret', async () => {
    const token = await mintToken(SECRET, NOW)
    const verified = await verifyToken(SECRET, token)
    expect(verified).not.toBeNull()
    expect(verified!.issuedAtMs).toBe(NOW)
  })

  it('rejects a token minted with a different secret', async () => {
    const token = await mintToken('other-secret', NOW)
    expect(await verifyToken(SECRET, token)).toBeNull()
  })

  it('rejects a tampered payload with a valid-shape signature', async () => {
    const token = await mintToken(SECRET, NOW)
    const [, sig] = token.split('.')
    const forgedPayload = base64UrlEncode(
      new TextEncoder().encode(`${NOW - 500_000}.${'a'.repeat(32)}`),
    )
    expect(await verifyToken(SECRET, `${forgedPayload}.${sig}`)).toBeNull()
  })

  it('rejects a re-split of the same signed bytes', async () => {
    // Take a valid token and try shifting bytes between the payload and
    // signature segments. Strict parsing must reject every re-split before
    // signature verification even matters.
    const token = await mintToken(SECRET, NOW)
    const [payload, sig] = token.split('.') as [string, string]
    const combined = payload + sig
    for (let split = 1; split < combined.length; split++) {
      if (split === payload.length) continue
      const candidate = `${combined.slice(0, split)}.${combined.slice(split)}`
      expect(await verifyToken(SECRET, candidate)).toBeNull()
    }
  })

  it('mints unique nonces', async () => {
    const a = parseToken(await mintToken(SECRET, NOW))
    const b = parseToken(await mintToken(SECRET, NOW))
    expect(a!.nonce).not.toBe(b!.nonce)
  })
})

describe('hmacHex', () => {
  it('is deterministic per secret and message', async () => {
    const one = await hmacHex(SECRET, '203.0.113.9')
    const two = await hmacHex(SECRET, '203.0.113.9')
    const other = await hmacHex(SECRET, '203.0.113.10')
    expect(one).toBe(two)
    expect(one).not.toBe(other)
    expect(one).toMatch(/^[0-9a-f]{64}$/)
  })

  it('differs across secrets', async () => {
    expect(await hmacHex('a', 'msg')).not.toBe(await hmacHex('b', 'msg'))
  })
})
