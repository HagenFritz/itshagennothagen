import { locationsBody, locationsHash } from '../../../lib/atxactly-locations'
import type { APIRoute, GetStaticPaths } from 'astro'

export const getStaticPaths: GetStaticPaths = () => [
  { params: { hash: locationsHash } },
]

export const GET: APIRoute = () =>
  new Response(locationsBody, {
    headers: { 'Content-Type': 'application/json' },
  })
