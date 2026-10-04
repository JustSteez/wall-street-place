// One-off: convert the source photos in public/img to compressed WebP (keeps a JPG fallback).
import { readdir } from 'node:fs/promises'
import { join } from 'node:path'
import sharp from 'sharp'

const dir = new URL('../public/img/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
for (const file of await readdir(dir)) {
  if (!file.endsWith('.jpg')) continue
  const src = join(dir, file) // source JPGs are not committed; re-download from Wikimedia to rerun
  const out = src.replace(/\.jpg$/, '.webp')
  const info = await sharp(src).resize({ width: 1920, withoutEnlargement: true }).webp({ quality: 70 }).toFile(out)
  console.log(`${file} -> ${Math.round(info.size / 1024)} KB webp`)
}
