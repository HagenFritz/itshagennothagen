export type SpriteName =
  | 'farmer'
  | 'grass_1'
  | 'grass_2'
  | 'grass_3'
  | 'weed_basic'
  | 'tile'
  | 'coin'

const NAMES: SpriteName[] = [
  'farmer',
  'grass_1',
  'grass_2',
  'grass_3',
  'weed_basic',
  'tile',
  'coin',
]

export type SpriteSheet = Record<SpriteName, HTMLImageElement>

export async function loadSprites(baseUrl: string): Promise<SpriteSheet> {
  const base = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/'
  const entries = await Promise.all(
    NAMES.map(
      (name) =>
        new Promise<[SpriteName, HTMLImageElement]>((resolve, reject) => {
          const img = new Image()
          img.onload = () => resolve([name, img])
          img.onerror = () => reject(new Error(`sprite failed: ${name}`))
          img.src = `${base}${name}.png`
        }),
    ),
  )
  return Object.fromEntries(entries) as SpriteSheet
}
