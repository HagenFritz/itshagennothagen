import {
  boundsOf,
  cartoDark,
  createTileMap,
  nearest,
  toLatLon,
  OVERLAY_CLASS,
  type LatLon,
  type MapView,
  type RouteCoord,
} from 'tile-map'
import { attachCarousel } from './carousel'

type Stop = LatLon & {
  title: string
  address: string
  perk: string
  photos?: { src: string; alt: string }[]
}
type StopMapData = { route: RouteCoord[]; stops: Stop[] }

const CARD_GAP = 14
const EDGE = 8
const CREDIT_HEIGHT = 20

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text?: string,
) {
  const node = document.createElement(tag)
  node.className = className
  if (text !== undefined) node.textContent = text
  return node
}

function mount(root: HTMLElement) {
  const { route, stops } = JSON.parse(
    root.querySelector('script[type="application/json"]')!.textContent!,
  ) as StopMapData
  const routePoints = route.map(toLatLon)

  const frame = el('div', 'stop-map-frame')
  const container = el('div', 'absolute inset-0')
  container.setAttribute('role', 'application')
  container.setAttribute(
    'aria-label',
    'Route map. Use the stop list below the map to open a stop.',
  )

  const card = el('article', 'trip-card')
  card.tabIndex = -1
  card.hidden = true
  const close = el('button', 'trip-card-close', '×')
  close.type = 'button'
  close.setAttribute('aria-label', 'Close')
  const media = el('div', '')
  const body = el('div', 'p-4 pr-10')
  const heading = el('p', 'font-medium')
  const address = el('p', 'mt-0.5 text-xs italic text-muted-foreground')
  const perk = el('p', 'mt-2 text-sm text-muted-foreground')
  body.append(heading, address, perk)
  card.append(close, media, body)

  const steppers = new Map<number, (delta: number) => void>()
  const galleries = stops.map((stop, i) => {
    if (!stop.photos?.length) return null
    const carousel = el('div', 'relative')
    carousel.dataset.carousel = ''
    const track = el(
      'div',
      'flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
    )
    track.dataset.track = ''
    for (const { src, alt } of stop.photos) {
      const slide = el('div', 'trip-card-slide')
      const img = el('img', 'trip-card-photo')
      img.src = src
      img.alt = alt
      img.loading = 'lazy'
      img.decoding = 'async'
      slide.append(img)
      track.append(slide)
    }
    carousel.append(track)
    if (stop.photos.length > 1) {
      track.classList.add('cursor-pointer')
      const dots = el(
        'div',
        'pointer-events-none absolute inset-x-0 bottom-2 flex justify-center gap-1.5',
      )
      for (const [d] of stop.photos.entries()) {
        const dot = el(
          'span',
          'size-1.5 rounded-full bg-white/40 transition-colors aria-[current=true]:bg-white',
        )
        dot.dataset.dot = ''
        dot.setAttribute('aria-current', String(d === 0))
        dots.append(dot)
      }
      carousel.append(dots)
      const step = attachCarousel(carousel)
      if (step) steppers.set(i, step)
    }
    return carousel
  })

  const credit = el(
    'div',
    'map-credit absolute bottom-1 right-1.5 z-[2] rounded bg-background/75 px-1.5 py-0.5 text-[10px] text-muted-foreground max-sm:bottom-auto max-sm:left-1.5 max-sm:right-auto max-sm:top-1',
  )
  const tileCredit = el('span', '')
  const osrm = el('a', '', 'OSRM')
  osrm.href = 'https://project-osrm.org/'
  credit.append(tileCredit, ' · Routing by ', osrm)

  const zoom = el('div', 'absolute right-2 top-2 z-[2] flex flex-col gap-1')
  const zoomButtons = (
    [
      ['+', 'Zoom in', 1],
      ['−', 'Zoom out', -1],
    ] as const
  ).map(([label, name, step]) => {
    const b = el('button', 'stop-map-zoom', label)
    b.type = 'button'
    b.setAttribute('aria-label', name)
    zoom.append(b)
    return [b, step] as const
  })

  frame.append(container, card, credit, zoom)

  const list = el('ol', 'stop-map-list')
  const buttons = stops.map((stop, i) => {
    const button = el('button', '')
    button.type = 'button'
    button.setAttribute('aria-expanded', 'false')
    button.append(
      el('span', 'stop-map-num', String(i + 1)),
      el('span', 'flex-1', stop.title),
    )
    const item = el('li', '')
    item.append(button)
    list.append(item)
    return button
  })

  root.append(frame, list)

  const canHover = window.matchMedia('(hover: hover)')
  const coarse = window.matchMedia('(pointer: coarse)')
  const docked = window.matchMedia('(max-width: 639px)')

  let selected: number | null = null
  let hovered: number | null = null
  let latestView: MapView | null = null

  const map = createTileMap(container, {
    source: cartoDark(import.meta.env.PUBLIC_CARTO_API_KEY ?? ''),
    bounds: boundsOf([...routePoints, ...stops]),
    zoom: { min: 9, max: 17 },
    padding: { top: 28, right: 28, bottom: 28, left: 28 },
    onDraw: (ctx, view) => {
      latestView = view
      draw(ctx, view)
    },
    onChange: (view) => {
      latestView = view
      position()
    },
    onTap: (px, py, view) => {
      const hit = nearest(stops, px, py, view.project, coarse.matches ? 22 : 14)
      select(hit ? stops.indexOf(hit) : null)
    },
    onHover: (px, py, view) => {
      if (!canHover.matches) return
      const hit = nearest(stops, px, py, view.project, 14)
      map.setCursor(hit ? 'pointer' : 'grab')
      const next = hit ? stops.indexOf(hit) : null
      if (next === hovered) return
      hovered = next
      map.redraw()
    },
  })

  function draw(ctx: CanvasRenderingContext2D, view: MapView) {
    ctx.beginPath()
    for (const [i, p] of routePoints.entries()) {
      const s = view.project(p)
      if (i === 0) ctx.moveTo(s.x, s.y)
      else ctx.lineTo(s.x, s.y)
    }
    ctx.strokeStyle = 'rgba(194,65,12,0.9)'
    ctx.lineWidth = 4
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()

    ctx.font = '600 10px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    for (const [i, s] of stops.entries()) {
      const p = view.project(s)
      const active = i === selected || (canHover.matches && i === hovered)
      if (active) {
        ctx.beginPath()
        ctx.arc(p.x, p.y, 14, 0, Math.PI * 2)
        ctx.strokeStyle = 'rgba(238,242,251,0.5)'
        ctx.lineWidth = 1.5
        ctx.stroke()
      }
      ctx.beginPath()
      ctx.arc(p.x, p.y, 9, 0, Math.PI * 2)
      ctx.fillStyle = '#c2410c'
      ctx.fill()
      ctx.strokeStyle = '#0b0f1a'
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.fillStyle = '#fff'
      ctx.fillText(String(i + 1), p.x, p.y + 0.5)
    }
  }

  function position() {
    if (selected === null || !latestView || docked.matches) {
      card.style.left = ''
      card.style.top = ''
      return
    }
    const p = latestView.project(stops[selected]!)
    const w = card.offsetWidth
    const h = card.offsetHeight
    let left = p.x + CARD_GAP
    if (left + w > latestView.width - EDGE) left = p.x - CARD_GAP - w
    left = Math.max(EDGE, Math.min(latestView.width - w - EDGE, left))
    const top = Math.max(
      EDGE,
      Math.min(latestView.height - h - EDGE - CREDIT_HEIGHT, p.y - h / 2),
    )
    card.style.left = `${left}px`
    card.style.top = `${top}px`
  }

  // Pan only as far as it takes for the pin to clear the card, so the fitted
  // view of the whole route survives.
  function panIntoView(index: number) {
    if (!latestView) return
    const view = latestView
    const p = view.project(stops[index]!)
    const w = docked.matches ? EDGE : card.offsetWidth + CARD_GAP + EDGE
    const bottom = docked.matches ? card.offsetHeight + EDGE * 3 : EDGE
    let dx = 0
    let dy = 0
    if (p.x < EDGE) dx = p.x - EDGE
    else if (p.x + w > view.width && p.x - w < 0) dx = p.x + w - view.width
    if (p.y < EDGE) dy = p.y - EDGE
    else if (p.y > view.height - bottom) dy = p.y - (view.height - bottom)
    if (!dx && !dy) return
    map.panTo(view.unproject(view.width / 2 + dx, view.height / 2 + dy))
  }

  function select(index: number | null) {
    selected = index
    for (const [i, b] of buttons.entries()) {
      b.setAttribute('aria-expanded', String(i === index))
    }
    card.hidden = index === null
    if (index !== null) {
      const stop = stops[index]!
      heading.textContent = `${index + 1}. ${stop.title}`
      address.textContent = stop.address
      perk.textContent = stop.perk
      media.replaceChildren(...(galleries[index] ? [galleries[index]] : []))
      panIntoView(index)
      position()
      card.focus({ preventScroll: true })
    }
    map.redraw()
  }

  close.addEventListener('click', (e) => {
    e.stopPropagation()
    select(null)
  })
  card.addEventListener('wheel', (e) => e.stopPropagation())
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') select(null)
    const step = selected === null ? undefined : steppers.get(selected)
    if (step && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
      step(e.key === 'ArrowLeft' ? -1 : 1)
    }
  })
  for (const [i, button] of buttons.entries()) {
    button.addEventListener('click', () => {
      select(i)
      frame.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    })
  }
  container
    .querySelector('.' + OVERLAY_CLASS)!
    .addEventListener('pointerleave', () => {
      if (hovered === null) return
      hovered = null
      map.redraw()
    })
  for (const [b, step] of zoomButtons) {
    b.addEventListener('click', () => map.zoomBy(step))
  }
  docked.addEventListener('change', () => position())

  tileCredit.innerHTML = map.attribution()
  map.setCursor('grab')
  map.fitBounds()
}

export function mountStopMaps() {
  for (const root of document.querySelectorAll<HTMLElement>('.stop-map')) {
    mount(root)
  }
}
