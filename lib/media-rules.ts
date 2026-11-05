export const MAX_IMAGE_FILE_SIZE = 8 * 1024 * 1024
export const ALLOWED_IMAGE_TYPES: ReadonlyMap<string, string> = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
  ['image/avif', 'avif'],
])

export function hasValidImageSignature(bytes: Uint8Array, mime: string): boolean {
  if (mime === 'image/jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  if (mime === 'image/png') return bytes.slice(0, 8).join(',') === '137,80,78,71,13,10,26,10'
  if (mime === 'image/webp') {
    return String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF'
      && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP'
  }
  if (mime === 'image/avif') {
    const isFtyp = String.fromCharCode(...bytes.slice(4, 8)) === 'ftyp'
    const brands = [
      String.fromCharCode(...bytes.slice(8, 12)),
      ...Array.from({ length: Math.max(0, Math.floor((bytes.length - 16) / 4)) }, (_, index) =>
        String.fromCharCode(...bytes.slice(16 + index * 4, 20 + index * 4)),
      ),
    ]
    return isFtyp && brands.some((brand) => brand === 'avif' || brand === 'avis')
  }
  return false
}
