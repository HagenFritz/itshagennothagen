// Snap-scroll photo carousel: a [data-track] of slides with [data-dot]
// indicators. Returns a stepper so callers can drive it (arrow keys), or null
// when there is nothing to page through.
export function attachCarousel(
  carousel: HTMLElement,
): ((delta: number) => void) | null {
  const track = carousel.querySelector<HTMLElement>('[data-track]')
  if (!track) return null
  const slides = [...track.children] as HTMLElement[]
  if (slides.length < 2) return null
  const dots = [...carousel.querySelectorAll<HTMLElement>('[data-dot]')]

  let index = 0
  const observer = new IntersectionObserver(
    (observed) => {
      for (const o of observed) {
        if (!o.isIntersecting) continue
        index = slides.indexOf(o.target as HTMLElement)
        dots.forEach((dot, i) =>
          dot.setAttribute('aria-current', String(i === index)),
        )
      }
    },
    { root: track, threshold: 0.6 },
  )
  for (const slide of slides) observer.observe(slide)

  const step = (delta: number) => {
    const next = (index + delta + slides.length) % slides.length
    track.scrollTo({ left: slides[next]!.offsetLeft, behavior: 'smooth' })
  }
  track.addEventListener('click', () => step(1))
  return step
}
