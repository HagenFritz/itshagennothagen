import { locationsBody, locationsHash } from '../../../lib/atxactly-locations'

export function getStaticPaths() {
  return [{ params: { hash: locationsHash } }]
}

export function GET() {
  return new Response(locationsBody, {
    headers: { 'Content-Type': 'application/json' },
  })
}
