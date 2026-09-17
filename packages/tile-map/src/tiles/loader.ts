import type { TileSource } from './source'

const CACHE_MAX = 600
const CACHE_TRIM = 300
const TRIES_MAX = 2000
const RETRY_BASE_MS = 800

export type TileLoader = {
  get: (z: number, x: number, y: number) => HTMLImageElement
  clear: () => void
}

// A long session at high zoom touches thousands of tiles; drop the oldest half
// so decoded bitmaps stay bounded (the browser HTTP cache makes a refetch cheap).
export function trimCache<T>(cache: Map<string, T>): Map<string, T> {
  if (cache.size <= CACHE_MAX) return cache
  let drop = CACHE_TRIM
  for (const k of cache.keys()) {
    if (drop-- <= 0) break
    cache.delete(k)
  }
  return cache
}

export function createTileLoader(
  source: TileSource,
  retina: boolean,
  onLoad: () => void,
): TileLoader {
  const tiles = new Map<string, HTMLImageElement>()
  const tries = new Map<string, number>()

  const get = (z: number, x: number, y: number) => {
    const key = `${z}/${x}/${y}`
    const hit = tiles.get(key)
    if (hit) return hit

    trimCache(tiles)
    if (tries.size > TRIES_MAX) tries.clear()

    const attempt = tries.get(key) ?? 0
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = onLoad
    img.onerror = () => {
      const next = (tries.get(key) ?? 0) + 1
      tries.set(key, next)
      if (next < source.maxTries) {
        setTimeout(() => {
          tiles.delete(key)
          onLoad()
        }, RETRY_BASE_MS * next)
      } else {
        img.setAttribute('data-failed', 'true')
      }
    }
    img.src = source.url({ z, x, y, retina, attempt })
    tiles.set(key, img)
    return img
  }

  return {
    get,
    clear: () => {
      tiles.clear()
      tries.clear()
    },
  }
}
