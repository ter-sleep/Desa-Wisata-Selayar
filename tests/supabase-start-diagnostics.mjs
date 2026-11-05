import { readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'

export function startupDiagnostics(output) {
  const phases = [
    ['Starting database', 'database startup'],
    ['Applying migration', 'database migrations'],
    ['Seeding data', 'database seed'],
    ['Starting containers', 'service startup'],
    ['Waiting for health checks', 'service health checks'],
  ]
  const lowerOutput = output.toLowerCase()
  let phase = 'initial setup'
  let lastMarker = -1
  for (const [marker, label] of phases) {
    const index = lowerOutput.lastIndexOf(marker.toLowerCase())
    if (index > lastMarker) {
      phase = label
      lastMarker = index
    }
  }

  const healthFailure = /\bcontainer is not (?:ready|running)\b/i.test(output)
  const connectionFailure = /\b(?:context deadline exceeded|tls handshake timeout|connection reset by peer|temporary failure in name resolution|unexpected eof|too many requests|toomanyrequests|502 bad gateway|503 service unavailable|504 gateway timeout)\b/i.test(output)
  const migrationFailure = /\b(?:sqlstate|failed to apply migration|error applying migration)\b/i.test(output)
  const diskFailure = /\bno space left on device\b/i.test(output)
  const portFailure = /\b(?:port is already allocated|address already in use)\b/i.test(output)
  const imageFailure = /\bexec format error\b/i.test(output)
  const signals = []
  if (healthFailure) {
    const services = new Set()
    const pattern = /\bsupabase_(db|auth|rest|storage|kong|inbucket)_[a-z0-9_-]+:?\s+container is not (?:ready|running)\b/gi
    for (const match of output.matchAll(pattern)) services.add(match[1].toLowerCase())
    const suffix = services.size ? ` (${[...services].sort().join(', ')})` : ''
    signals.push(`Service readiness failure${suffix}.`)
  }
  if (connectionFailure) signals.push('Connection timeout, interruption, or registry rate limit.')
  if (migrationFailure) signals.push('Database migration error.')
  if (diskFailure) signals.push('Runner disk is full.')
  if (portFailure) signals.push('A required port is already in use.')
  if (imageFailure) signals.push('Container image architecture error.')
  if (!signals.length) signals.push('Cause not identified by safe diagnostics.')

  return {
    phase,
    signals,
    retryable: !migrationFailure && !diskFailure && !portFailure && !imageFailure && (healthFailure || connectionFailure),
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let output
  try {
    output = await readFile(process.argv[2], 'utf8')
  } catch {
    console.error('Could not read the private Supabase startup log.')
    process.exitCode = 1
  }
  if (output !== undefined) {
    const diagnostics = startupDiagnostics(output)
    console.log(`Supabase startup phase: ${diagnostics.phase}.`)
    for (const signal of diagnostics.signals) console.log(signal)
    process.exitCode = diagnostics.retryable ? 0 : 1
  }
}
