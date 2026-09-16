export type TileRequest = {
  z: number
  x: number
  y: number
  retina: boolean
  attempt: number
}

export type SourceName = 'carto' | 'esri'

export type TileSource = {
  name: SourceName
  attribution: string
  maxTries: number
  url: (request: TileRequest) => string
}

export const CARTO_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy; <a href="https://carto.com/attributions">CARTO</a>'

export const ESRI_ATTRIBUTION =
  'Esri, HERE, Garmin, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, and the GIS user community'

export const ATTRIBUTION: Record<SourceName, string> = {
  carto: CARTO_ATTRIBUTION,
  esri: ESRI_ATTRIBUTION,
}

const cartoUrl = (key: string, { z, x, y, retina }: TileRequest) => {
  const sub = 'abcd'[(x + y) % 4]
  const at2x = retina ? '@2x' : ''
  return `https://${sub}.basemaps.cartocdn.com/rastertiles/dark_all/${z}/${x}/${y}${at2x}.png?key=${key}`
}

// Esri orders its path {z}/{y}/{x}, the reverse of the XYZ convention.
const esriUrl = ({ z, x, y }: TileRequest) =>
  `https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/${z}/${y}/${x}`

export function cartoDark(key: string): TileSource {
  if (!key) {
    return {
      name: 'esri',
      attribution: ESRI_ATTRIBUTION,
      maxTries: 2,
      url: esriUrl,
    }
  }
  return {
    name: 'carto',
    attribution: CARTO_ATTRIBUTION,
    maxTries: 3,
    url: (request) =>
      request.attempt >= 2 ? esriUrl(request) : cartoUrl(key, request),
  }
}
