// Session tokens: base64url(payload).base64url(hmac-sha256(payload)) where
// payload is "issuedAtMs.nonce" with fixed alphabets (digits, then 32 hex
// chars). Strict parsing means the same signed bytes cannot be re-split to
// shift the effective issue time.

export interface ParsedToken {
  issuedAtMs: number
  nonce: string
  payloadBytes: Uint8Array<ArrayBuffer>
  signatureBytes: Uint8Array<ArrayBuffer>
}

const TOKEN_PATTERN = /^([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)$/
const PAYLOAD_PATTERN = /^(\d{1,15})\.([0-9a-f]{32})$/
const MAX_TOKEN_LENGTH = 200
const HMAC_SHA256_BYTES = 32

export function base64UrlEncode(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function base64UrlDecode(text: string): Uint8Array<ArrayBuffer> | null {
  if (!/^[A-Za-z0-9_-]+$/.test(text)) return null
  const base64 = text.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  try {
    const binary = atob(padded)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return bytes
  } catch {
    return null
  }
}

export function parseToken(token: unknown): ParsedToken | null {
  if (typeof token !== 'string' || token.length > MAX_TOKEN_LENGTH) return null
  const match = TOKEN_PATTERN.exec(token)
  if (!match) return null
  const payloadBytes = base64UrlDecode(match[1]!)
  const signatureBytes = base64UrlDecode(match[2]!)
  if (!payloadBytes || !signatureBytes) return null
  if (signatureBytes.length !== HMAC_SHA256_BYTES) return null
  const payloadMatch = PAYLOAD_PATTERN.exec(
    new TextDecoder().decode(payloadBytes),
  )
  if (!payloadMatch) return null
  const issuedAtMs = Number(payloadMatch[1])
  if (!Number.isSafeInteger(issuedAtMs)) return null
  return { issuedAtMs, nonce: payloadMatch[2]!, payloadBytes, signatureBytes }
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  )
}

export async function mintToken(
  secret: string,
  nowMs: number,
): Promise<string> {
  const nonceBytes = new Uint8Array(16)
  crypto.getRandomValues(nonceBytes)
  const nonce = bytesToHex(nonceBytes)
  const payloadBytes = new TextEncoder().encode(`${nowMs}.${nonce}`)
  const key = await importHmacKey(secret)
  const signature = new Uint8Array(
    await crypto.subtle.sign('HMAC', key, payloadBytes),
  )
  return `${base64UrlEncode(payloadBytes)}.${base64UrlEncode(signature)}`
}

// Returns the parsed token only when the signature verifies; parsing alone
// grants nothing.
export async function verifyToken(
  secret: string,
  token: unknown,
): Promise<ParsedToken | null> {
  const parsed = parseToken(token)
  if (!parsed) return null
  const key = await importHmacKey(secret)
  const valid = await crypto.subtle.verify(
    'HMAC',
    key,
    parsed.signatureBytes,
    parsed.payloadBytes,
  )
  return valid ? parsed : null
}

export async function hmacHex(
  secret: string,
  message: string,
): Promise<string> {
  const key = await importHmacKey(secret)
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(message),
  )
  return bytesToHex(new Uint8Array(signature))
}

function bytesToHex(bytes: Uint8Array): string {
  let hex = ''
  for (const byte of bytes) hex += byte.toString(16).padStart(2, '0')
  return hex
}
