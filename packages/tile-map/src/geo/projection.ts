export const TILE_SIZE = 256

export const MAX_MERCATOR_LAT = 85.0511287798066

export type LatLon = { lat: number; lon: number }

export type RouteCoord = [lat: number, lon: number]

export const toLatLon = ([lat, lon]: RouteCoord): LatLon => ({ lat, lon })

const worldSize = (z: number) => Math.pow(2, z) * TILE_SIZE

export const lonToX = (lon: number, z: number) =>
  ((lon + 180) / 360) * worldSize(z)

export const latToY = (lat: number, z: number) => {
  const s = Math.sin((lat * Math.PI) / 180)
  return (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * worldSize(z)
}

export const xToLon = (x: number, z: number) => (x / worldSize(z)) * 360 - 180

export const yToLat = (y: number, z: number) => {
  const n = Math.PI - (2 * Math.PI * y) / worldSize(z)
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)))
}

export const metersPerPixel = (lat: number, z: number) =>
  (156543.03392 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, z)
