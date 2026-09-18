import { mintToken } from 'weed-whacker/leaderboard'
import { isRateLimited } from './_rate-limit'

// Issues an HMAC-signed session token at run start. Stores nothing; the
// token becomes single-use when the submit inserts its nonce.
export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  try {
    if (await isRateLimited(env.DB, env.LEADERBOARD_SECRET, request, 'runs')) {
      return Response.json({ error: 'rate_limited' }, { status: 429 })
    }
    const token = await mintToken(env.LEADERBOARD_SECRET, Date.now())
    return Response.json({ token })
  } catch {
    return Response.json({ error: 'server_error' }, { status: 500 })
  }
}
