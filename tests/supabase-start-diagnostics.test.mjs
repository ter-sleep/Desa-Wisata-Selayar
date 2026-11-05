import assert from 'node:assert/strict'
import test from 'node:test'
import { startupDiagnostics } from './supabase-start-diagnostics.mjs'

test('startup diagnostics identify readiness failures without exposing raw output', () => {
  const secret = 'private-local-service-key'
  const diagnostics = startupDiagnostics([
    'Applying migration 202611040006_stage_7_hardening.sql...',
    'Starting containers...',
    'Waiting for health checks...',
    `supabase_storage_project container is not ready: unhealthy (probe output: ${secret})`,
    `API key: ${secret}`,
  ].join('\n'))
  assert.equal(diagnostics.phase, 'service health checks')
  assert.deepEqual(diagnostics.signals, ['Service readiness failure (storage).'])
  assert.equal(diagnostics.retryable, true)
  assert.equal(JSON.stringify(diagnostics).includes(secret), false)
})

test('startup diagnostics only retry recognized infrastructure failures', () => {
  const network = startupDiagnostics('Starting containers...\nTLS handshake timeout')
  assert.equal(network.phase, 'service startup')
  assert.equal(network.retryable, true)

  for (const reason of [
    'ERROR: migration failed (SQLSTATE 23514)',
    'no space left on device',
    'port is already allocated',
    'exec format error',
  ]) {
    const diagnostics = startupDiagnostics(`Applying migration example.sql\n${reason}\ncontext deadline exceeded`)
    assert.equal(diagnostics.retryable, false, reason)
    assert.notEqual(diagnostics.signals.length, 0)
  }

  const unknown = startupDiagnostics('private unknown failure')
  assert.equal(unknown.phase, 'initial setup')
  assert.equal(unknown.retryable, false)
  assert.deepEqual(unknown.signals, ['Cause not identified by safe diagnostics.'])
})
