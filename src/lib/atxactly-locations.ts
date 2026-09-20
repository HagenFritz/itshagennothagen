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
  const out: Location = {
    id: l.id,
    name: l.name,
    lat: l.lat,
    lon: l.lon,
    category: l.category,
    difficulty: l.difficulty as number,
    story: l.story as string,
    extra: l.extra,
    storyUrl: l.storyUrl,
  }
  if (l.shape !== undefined) out.shape = l.shape
  if (l.photo !== undefined) out.photo = l.photo
  return out
}

export const locations: Location[] = (raw as RawLocation[])
  .filter((l) => l.status === 'eligible')
  .map(trim)

export const locationsBody = JSON.stringify(locations)

export const locationsHash = createHash('sha256')
  .update(locationsBody)
  .digest('hex')
  .slice(0, 8)

export const locationsUrl = `/data/atxactly/${locationsHash}.json`
