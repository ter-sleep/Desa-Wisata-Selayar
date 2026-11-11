import assert from 'node:assert/strict'
import test from 'node:test'
import { hasVerifiedCoordinates } from '../lib/gps-rules'

test('public markers require coordinates and complete verification attribution', () => {
  const complete = {
    verification_status: 'verified' as const,
    latitude: 0,
    longitude: 0,
    verified_at: '2026-01-01T00:00:00Z',
    verified_by: 'reviewer',
    reviewed_at: '2026-01-01T00:00:00Z',
    reviewed_by: 'reviewer',
  }
  assert.equal(hasVerifiedCoordinates(complete), true)
  assert.equal(hasVerifiedCoordinates({ ...complete, latitude: null }), false)
  assert.equal(hasVerifiedCoordinates({ ...complete, longitude: null }), false)
  assert.equal(hasVerifiedCoordinates({ ...complete, verified_by: null }), false)
  assert.equal(hasVerifiedCoordinates({ ...complete, reviewed_at: null }), false)
  assert.equal(hasVerifiedCoordinates({ ...complete, verification_status: 'pending' }), false)
  assert.equal(hasVerifiedCoordinates({ ...complete, verification_status: 'rejected' }), false)
})
