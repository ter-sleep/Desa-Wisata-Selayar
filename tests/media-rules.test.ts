import assert from 'node:assert/strict'
import test from 'node:test'
import { ALLOWED_IMAGE_TYPES, hasValidImageSignature, MAX_IMAGE_FILE_SIZE } from '../lib/media-rules'

test('image signatures must match the declared supported format', () => {
  const jpeg = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0])
  const png = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10])
  const webp = Uint8Array.from(Buffer.from('RIFF0000WEBP'))
  const avif = Uint8Array.from([0, 0, 0, 24, ...Buffer.from('ftypavif'), 0, 0, 0, 0])
  assert.equal(hasValidImageSignature(jpeg, 'image/jpeg'), true)
  assert.equal(hasValidImageSignature(png, 'image/png'), true)
  assert.equal(hasValidImageSignature(webp, 'image/webp'), true)
  assert.equal(hasValidImageSignature(avif, 'image/avif'), true)
  assert.equal(hasValidImageSignature(jpeg, 'image/png'), false)
  assert.equal(hasValidImageSignature(png.slice(0, 4), 'image/png'), false)
  assert.equal(hasValidImageSignature(avif, 'image/svg+xml'), false)
  assert.equal(MAX_IMAGE_FILE_SIZE, 8 * 1024 * 1024)
  assert.deepEqual([...ALLOWED_IMAGE_TYPES.keys()], ['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
})
