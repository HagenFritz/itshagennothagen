import { createHash } from 'node:crypto'
import raw from '../data/atxactly-locations.json'

export type Location = {
  id: string
  name: string
  lat: number
  lon: number
  category: string
  difficulty: number
  story: string
  extra: string | null
  storyUrl: string | null
  shape?: number[][][]
  photo?: { url: string; attribution: string } | null
}

type RawLocation = Omit<Location, 'difficulty' | 'story'> & {
  difficulty: number | null
  story: string | null
  status: string
}

const trim = (l: RawLocation): Location => {
  // Runs at build time, so a hand edit that marks a row eligible before
  // filling in its fields fails the build instead of shrinking a band.
  if (typeof l.difficulty !== 'number')
    throw new Error(`eligible location ${l.id} has no difficulty`)
  if (typeof l.story !== 'string')
    throw new Error(`eligible location ${l.id} has no story`)
  const out: Location = {
    id: l.id,
    name: l.name,
    lat: l.lat,
    lon: l.lon,
    category: l.category,
    difficulty: l.difficulty,
    story: l.story,
    extra: l.extra,
    storyUrl: l.storyUrl,
  }
  if (l.shape !== undefined) out.shape = l.shape
  if (l.photo !== undefined) out.photo = l.photo
  return out
}

const locations: Location[] = (raw as RawLocation[])
  .filter((l) => l.status === 'eligible')
  .map(trim)

export const locationsBody = JSON.stringify(locations)

export const locationsHash = createHash('sha256')
  .update(locationsBody)
  .digest('hex')
  .slice(0, 8)

export const locationsUrl = `/data/atxactly/${locationsHash}.json`
