#!/usr/bin/env node
/**
 * Downscale road trip photos in place for committing to src/assets.
 *
 *     node scripts/prep_roadtrip_photos.mjs <slug>
 *
 * Orientation is baked into the pixels so nothing downstream renders sideways,
 * and EXIF is kept so stop coordinates can be re-derived from the GPS tags.
 */

import { readdir, rename, rm, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const MAX_EDGE = 2000
const QUALITY = 85
const SOURCE_EXT = new Set(['.jpg', '.jpeg', '.png'])

const slug = process.argv[2]
if (!slug) {
  console.error('usage: node scripts/prep_roadtrip_photos.mjs <slug>')
  process.exit(1)
}

const dir = path.join(REPO, 'src', 'assets', 'roadtrips', slug)
const names = (await readdir(dir))
  .filter((name) => SOURCE_EXT.has(path.extname(name).toLowerCase()))
  .sort()

let totalBefore = 0
let totalAfter = 0

for (const name of names) {
  const source = path.join(dir, name)
  const target = path.join(
    dir,
    `${path.basename(name, path.extname(name))}.jpg`,
  )
  const before = await stat(source)
  const meta = await sharp(source).metadata()
  const rotated = (meta.orientation ?? 1) >= 5
  const width = rotated ? meta.height : meta.width
  const height = rotated ? meta.width : meta.height
  totalBefore += before.size

  if (Math.max(width, height) <= MAX_EDGE && source === target) {
    totalAfter += before.size
    console.log(`${name}  ${width}x${height}  ${before.size} bytes  unchanged`)
    continue
  }

  const temp = path.join(dir, `.${name}.tmp`)
  await sharp(source)
    .rotate()
    .resize({
      width: MAX_EDGE,
      height: MAX_EDGE,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({ quality: QUALITY, mozjpeg: true })
    .withMetadata()
    .toFile(temp)

  // Source goes first: on a case-insensitive volume IMG.JPG and IMG.jpg are
  // one file, so removing it after the rename deletes the output.
  if (source !== target) await rm(source)
  await rename(temp, target)

  const after = await stat(target)
  const out = await sharp(target).metadata()
  totalAfter += after.size
  console.log(
    `${name} -> ${path.basename(target)}  ${width}x${height} -> ${out.width}x${out.height}  ${before.size} -> ${after.size} bytes`,
  )
}

console.log(
  `total  ${totalBefore} -> ${totalAfter} bytes  (${names.length} files)`,
)
