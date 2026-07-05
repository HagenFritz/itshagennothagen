import { mintToken } from 'weed-whacker/leaderboard'

// Issues an HMAC-signed session token at run start. Stores nothing; the
// token becomes single-use when the submit inserts its nonce.
export const onRequestPost: PagesFunction<Env> = async ({ env }) => {
  try {
    const token = await mintToken(env.LEADERBOARD_SECRET, Date.now())
    return Response.json({ token })
  } catch {
    return Response.json({ error: 'server_error' }, { status: 500 })
  }
}
