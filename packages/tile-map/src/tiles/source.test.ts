import { describe, expect, it } from 'vitest'
import { ATTRIBUTION, cartoDark } from './source'

describe('cartoDark with a key', () => {
  const source = cartoDark('secret')

  it('serves CARTO for the first two attempts', () => {
    for (const attempt of [0, 1]) {
      const url = source.url({ z: 11, x: 4, y: 7, retina: false, attempt })
      expect(url).toContain('basemaps.cartocdn.com/rastertiles/dark_all/11/4/7')
      expect(url).toContain('?key=secret')
      expect(url).not.toContain('@2x')
    }
  })

  it('adds the retina suffix only when retina is true', () => {
    expect(
      source.url({ z: 11, x: 4, y: 7, retina: true, attempt: 0 }),
    ).toContain('/11/4/7@2x.png')
  })

  it('falls back to Esri on the third attempt with y before x', () => {
    const url = source.url({ z: 11, x: 4, y: 7, retina: true, attempt: 2 })
    expect(url).toContain('World_Dark_Gray_Base/MapServer/tile/11/7/4')
  })

  it('rotates the subdomain with x + y', () => {
    const sub = (x: number, y: number) =>
      new URL(source.url({ z: 3, x, y, retina: false, attempt: 0 })).hostname[0]
    expect([sub(0, 0), sub(1, 0), sub(1, 1), sub(2, 1)]).toEqual([
      'a',
      'b',
      'c',
      'd',
    ])
  })

  it('reports itself as carto and allows three tries', () => {
    expect(source.name).toBe('carto')
    expect(source.maxTries).toBe(3)
  })
})

describe('cartoDark with no key', () => {
  const source = cartoDark('')

  it('serves Esri on every attempt', () => {
    for (const attempt of [0, 1, 2]) {
      expect(source.url({ z: 5, x: 2, y: 9, retina: true, attempt })).toContain(
        'World_Dark_Gray_Base/MapServer/tile/5/9/2',
      )
    }
  })

  it('reports itself as esri and allows two tries', () => {
    expect(source.name).toBe('esri')
    expect(source.maxTries).toBe(2)
    expect(source.attribution).toBe(ATTRIBUTION.esri)
  })
})

describe('attribution', () => {
  it('credits OpenStreetMap from both sources', () => {
    for (const html of [ATTRIBUTION.carto, ATTRIBUTION.esri]) {
      expect(html).toContain('https://www.openstreetmap.org/copyright')
    }
    expect(ATTRIBUTION.carto).toContain('https://carto.com/attributions')
    expect(ATTRIBUTION.esri).toContain('Esri')
  })
})
