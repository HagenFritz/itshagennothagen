import {
  fitCenter,
  fitZoom,
  latToY,
  lonToX,
  xToLon,
  yToLat,
  type Bounds,
  type LatLon,
  type Padding,
} from './geo/index'

export type ViewSize = { width: number; height: number }

export type CameraOptions = {
  bounds: Bounds
  minZoom: number
  maxZoom: number
  padding: Padding
}

export class Camera {
  center: LatLon
  zoom: number
  private readonly bounds: Bounds
  private readonly minZoom: number
  private readonly maxZoom: number
  private readonly padding: Padding

  constructor(options: CameraOptions) {
    this.bounds = options.bounds
    this.minZoom = options.minZoom
    this.maxZoom = options.maxZoom
    this.padding = options.padding
    this.center = {
      lat: (options.bounds.minLat + options.bounds.maxLat) / 2,
      lon: (options.bounds.minLon + options.bounds.maxLon) / 2,
    }
    this.zoom = options.minZoom
  }

  clamp(): void {
    this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom))
    this.center.lon = Math.max(
      this.bounds.minLon,
      Math.min(this.bounds.maxLon, this.center.lon),
    )
    // The mobile dock covers the bottom band, so the southern clamp is relaxed
    // by that reservation or content under the dock can never be panned clear.
    const southY = latToY(this.bounds.minLat, this.zoom) + this.padding.bottom
    const south = yToLat(southY, this.zoom)
    this.center.lat = Math.max(
      Math.min(south, this.bounds.maxLat),
      Math.min(this.bounds.maxLat, this.center.lat),
    )
  }

  project(p: LatLon, view: ViewSize): { x: number; y: number } {
    return {
      x:
        lonToX(p.lon, this.zoom) -
        (lonToX(this.center.lon, this.zoom) - view.width / 2),
      y:
        latToY(p.lat, this.zoom) -
        (latToY(this.center.lat, this.zoom) - view.height / 2),
    }
  }

  unproject(px: number, py: number, view: ViewSize): LatLon {
    return {
      lon: xToLon(
        lonToX(this.center.lon, this.zoom) - view.width / 2 + px,
        this.zoom,
      ),
      lat: yToLat(
        latToY(this.center.lat, this.zoom) - view.height / 2 + py,
        this.zoom,
      ),
    }
  }

  panBy(dx: number, dy: number): void {
    this.center = {
      lon: xToLon(lonToX(this.center.lon, this.zoom) - dx, this.zoom),
      lat: yToLat(latToY(this.center.lat, this.zoom) - dy, this.zoom),
    }
    this.clamp()
  }

  panTo(center: LatLon): void {
    this.center = { ...center }
    this.clamp()
  }

  setView(center: LatLon, zoom: number): void {
    this.center = { ...center }
    this.zoom = zoom
    this.clamp()
  }

  // The correction is applied in world pixels, not degrees: latitude is
  // nonlinear in Mercator, so a degree delta measured at one zoom does not
  // land exactly at another.
  zoomAt(steps: number, px: number, py: number, view: ViewSize): void {
    if (!steps) return
    const anchor = this.unproject(px, py, view)
    this.zoom = Math.round(this.zoom) + steps
    this.clamp()
    const after = this.project(anchor, view)
    this.panBy(px - after.x, py - after.y)
  }

  fit(view: ViewSize): void {
    this.zoom = fitZoom(
      this.bounds,
      view.width,
      view.height,
      this.padding,
      this.minZoom,
      this.maxZoom,
    )
    this.center = fitCenter(this.bounds, this.zoom, this.padding)
    this.clamp()
  }
}
