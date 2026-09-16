import { Camera } from './camera'
import {
  TILE_SIZE,
  latToY,
  lonToX,
  metersPerPixel,
  type Bounds,
  type LatLon,
  type Padding,
} from './geo/index'
import { createTileLoader } from './tiles/loader'
import type { SourceName, TileSource } from './tiles/source'

export const TILES_CLASS = 'tile-map-tiles'
export const OVERLAY_CLASS = 'tile-map-overlay'

const BACKGROUND = '#0b0f1a'
const DRAG_SLOP_PX = 4
const WHEEL_STEP = 500
const ZOOM_COOLDOWN_MS = 260

export type MapView = {
  project: (p: LatLon) => { x: number; y: number }
  unproject: (px: number, py: number) => LatLon
  zoom: number
  metersPerPixel: number
  width: number
  height: number
}

export type TileMapOptions = {
  source: TileSource
  bounds: Bounds
  zoom: { min: number; max: number }
  padding: Padding
  onDraw?: (ctx: CanvasRenderingContext2D, view: MapView) => void
  onChange?: (view: MapView) => void
  onTap?: (px: number, py: number, view: MapView) => void
  onHover?: (px: number, py: number, view: MapView) => void
}

export type TileMap = {
  fitBounds: () => void
  setView: (center: LatLon, zoom: number) => void
  panTo: (center: LatLon) => void
  zoomBy: (steps: number, px?: number, py?: number) => void
  redraw: () => void
  setCursor: (css: string) => void
  activeSource: () => SourceName
  attribution: () => string
  destroy: () => void
}

const makeCanvas = (className: string) => {
  const canvas = document.createElement('canvas')
  canvas.className = className
  canvas.style.position = 'absolute'
  canvas.style.inset = '0'
  canvas.style.width = '100%'
  canvas.style.height = '100%'
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2d canvas context unavailable')
  return { canvas, ctx }
}

export function createTileMap(
  container: HTMLElement,
  options: TileMapOptions,
): TileMap {
  const { canvas: tilesCanvas, ctx: tilesCtx } = makeCanvas(TILES_CLASS)
  tilesCanvas.style.pointerEvents = 'none'
  const { canvas: overlayCanvas, ctx: overlayCtx } = makeCanvas(OVERLAY_CLASS)
  overlayCanvas.style.touchAction = 'none'
  container.append(tilesCanvas, overlayCanvas)

  const camera = new Camera({
    bounds: options.bounds,
    minZoom: options.zoom.min,
    maxZoom: options.zoom.max,
    padding: options.padding,
  })

  let size = { width: 0, height: 0 }
  const retina = (window.devicePixelRatio || 1) > 1.3
  const loader = createTileLoader(options.source, retina, () => drawTiles())

  const view = (): MapView => ({
    project: (p) => camera.project(p, size),
    unproject: (px, py) => camera.unproject(px, py, size),
    zoom: camera.zoom,
    metersPerPixel: metersPerPixel(camera.center.lat, camera.zoom),
    width: size.width,
    height: size.height,
  })

  function drawTiles() {
    const { width: w, height: h } = size
    if (w <= 0 || h <= 0) return
    tilesCtx.fillStyle = BACKGROUND
    tilesCtx.fillRect(0, 0, w, h)
    const z = Math.round(camera.zoom)
    const scale = 2 ** (camera.zoom - z)
    const ox = lonToX(camera.center.lon, z) - w / (2 * scale)
    const oy = latToY(camera.center.lat, z) - h / (2 * scale)
    const span = 2 ** z
    for (
      let tx = Math.floor(ox / TILE_SIZE);
      tx <= Math.floor((ox + w / scale) / TILE_SIZE);
      tx++
    ) {
      for (
        let ty = Math.floor(oy / TILE_SIZE);
        ty <= Math.floor((oy + h / scale) / TILE_SIZE);
        ty++
      ) {
        if (ty < 0 || ty >= span) continue
        const wrapped = ((tx % span) + span) % span
        const img = loader.get(z, wrapped, ty)
        if (!img.complete || img.hasAttribute('data-failed')) continue
        tilesCtx.drawImage(
          img,
          (tx * TILE_SIZE - ox) * scale,
          (ty * TILE_SIZE - oy) * scale,
          TILE_SIZE * scale,
          TILE_SIZE * scale,
        )
      }
    }
  }

  function drawOverlay() {
    const { width: w, height: h } = size
    overlayCtx.clearRect(0, 0, w, h)
    options.onDraw?.(overlayCtx, view())
  }

  function drawAll() {
    drawTiles()
    drawOverlay()
  }

  function changed() {
    drawAll()
    options.onChange?.(view())
  }

  function resize() {
    const rect = container.getBoundingClientRect()
    size = { width: rect.width, height: rect.height }
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    for (const [canvas, ctx] of [
      [tilesCanvas, tilesCtx],
      [overlayCanvas, overlayCtx],
    ] as const) {
      canvas.width = Math.round(size.width * dpr)
      canvas.height = Math.round(size.height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    camera.clamp()
    changed()
  }

  let dragging = false
  let moved = false
  let last = { x: 0, y: 0 }

  const local = (e: PointerEvent | WheelEvent) => {
    const rect = overlayCanvas.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const onPointerDown = (e: PointerEvent) => {
    dragging = true
    moved = false
    last = { x: e.clientX, y: e.clientY }
    overlayCanvas.setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: PointerEvent) => {
    if (!dragging) {
      const { x, y } = local(e)
      options.onHover?.(x, y, view())
      return
    }
    const dx = e.clientX - last.x
    const dy = e.clientY - last.y
    if (Math.abs(dx) + Math.abs(dy) > DRAG_SLOP_PX) moved = true
    last = { x: e.clientX, y: e.clientY }
    camera.panBy(dx, dy)
    changed()
  }

  const onPointerUp = (e: PointerEvent) => {
    dragging = false
    if (moved) return
    const { x, y } = local(e)
    options.onTap?.(x, y, view())
  }

  // A browser-interrupted gesture (system edge swipe, context menu) fires
  // pointercancel, not pointerup; without this the map keeps panning.
  const onPointerCancel = () => {
    dragging = false
    moved = false
  }

  let wheelAccum = 0
  let lastZoomAt = 0

  const onWheel = (e: WheelEvent) => {
    e.preventDefault()
    const { x, y } = local(e)
    const unit = e.deltaMode === 1 ? 40 : 1
    wheelAccum += e.deltaY * unit * (e.ctrlKey ? 6 : 1)
    if (Math.abs(wheelAccum) < WHEEL_STEP) return
    const now = performance.now()
    if (now - lastZoomAt < ZOOM_COOLDOWN_MS) {
      // Hold the accumulator at the threshold so one gesture fires once more
      // when the cooldown lapses, not several times at once.
      wheelAccum = Math.sign(wheelAccum) * WHEEL_STEP
      return
    }
    lastZoomAt = now
    const dir = wheelAccum < 0 ? 1 : -1
    wheelAccum = 0
    camera.zoomAt(dir, x, y, size)
    changed()
  }

  overlayCanvas.addEventListener('pointerdown', onPointerDown)
  overlayCanvas.addEventListener('pointermove', onPointerMove)
  overlayCanvas.addEventListener('pointerup', onPointerUp)
  overlayCanvas.addEventListener('pointercancel', onPointerCancel)
  overlayCanvas.addEventListener('wheel', onWheel, { passive: false })

  const observer = new ResizeObserver(() => resize())
  observer.observe(container)

  const rect = container.getBoundingClientRect()
  size = { width: rect.width, height: rect.height }
  camera.fit(size)
  resize()

  return {
    fitBounds: () => {
      camera.fit(size)
      changed()
    },
    setView: (center, zoom) => {
      camera.setView(center, zoom)
      changed()
    },
    panTo: (center) => {
      camera.panTo(center)
      changed()
    },
    zoomBy: (steps, px, py) => {
      camera.zoomAt(steps, px ?? size.width / 2, py ?? size.height / 2, size)
      changed()
    },
    redraw: drawOverlay,
    setCursor: (css) => {
      overlayCanvas.style.cursor = css
    },
    activeSource: () => options.source.name,
    attribution: () => options.source.attribution,
    destroy: () => {
      observer.disconnect()
      overlayCanvas.removeEventListener('pointerdown', onPointerDown)
      overlayCanvas.removeEventListener('pointermove', onPointerMove)
      overlayCanvas.removeEventListener('pointerup', onPointerUp)
      overlayCanvas.removeEventListener('pointercancel', onPointerCancel)
      overlayCanvas.removeEventListener('wheel', onWheel)
      loader.clear()
      tilesCanvas.remove()
      overlayCanvas.remove()
    },
  }
}
