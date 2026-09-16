import { describe, expect, it } from 'vitest'

describe('node import safety', () => {
  it('imports the package root with no DOM globals present', async () => {
    expect(typeof globalThis.document).toBe('undefined')
    const mod = await import('../index')
    for (const name of [
      'lonToX',
      'latToY',
      'xToLon',
      'yToLat',
      'boundsOf',
      'fitZoom',
      'haversineMeters',
      'nearest',
      'routeToSvgPath',
    ] as const) {
      expect(typeof mod[name]).toBe('function')
    }
  })

  it('imports the geo entry point on its own', async () => {
    const geo = await import('./index')
    expect(typeof geo.metersPerPixel).toBe('function')
  })
})
