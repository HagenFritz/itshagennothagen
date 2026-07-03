const NAMES = ['farmer', 'grass_1', 'grass_2', 'grass_3', 'weed_basic'] as const

export type SpriteName = (typeof NAMES)[number]
export type SpriteSheet = Record<SpriteName, HTMLImageElement>

export async function loadSprites(baseUrl: string): Promise<SpriteSheet> {
  const entries = await Promise.all(
    NAMES.map(
      (name) =>
        new Promise<[SpriteName, HTMLImageElement]>((resolve, reject) => {
          const img = new Image()
          img.onload = () => resolve([name, img])
          img.onerror = () => reject(new Error(`sprite failed: ${name}`))
          img.src = `${baseUrl}${name}.png`
        }),
    ),
  )
  return Object.fromEntries(entries) as SpriteSheet
}
