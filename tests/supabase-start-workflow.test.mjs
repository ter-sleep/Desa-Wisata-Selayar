import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import test from 'node:test'

const bashAvailable = spawnSync('bash', ['--version'], { stdio: 'ignore' }).status === 0
const mockedWorkflow = `
start_count=0
supabase() {
  echo "$*" >> "$RUNNER_TEMP/calls"
  case "$1" in
    init) return 0 ;;
    start)
      start_count=$((start_count + 1))
      if [ "$start_count" -le "$MOCK_FAILURES" ]; then
        printf '%s\\n' "$MOCK_LOG"
        return 1
      fi
      return 0
      ;;
    stop)
      printf '%s\\n' "$MOCK_STOP_LOG"
      return "$MOCK_STOP_STATUS"
      ;;
    *) return 99 ;;
  esac
}
docker() { echo "docker $*" >> "$RUNNER_TEMP/calls"; }
sleep() { echo "sleep $*" >> "$RUNNER_TEMP/calls"; }
source .github/scripts/start-disposable-supabase.sh
`

async function runWorkflow(t, { failures, log, stopStatus = 0, stopLog = '' }) {
  if (!bashAvailable) {
    t.skip('Bash is required to exercise the GitHub Actions startup script.')
    return
  }
  const directory = await mkdtemp(join(tmpdir(), 'dewis-start-test-'))
  t.after(() => rm(directory, { recursive: true, force: true }))
  let runnerTemp = directory
  if (process.platform === 'win32') {
    const converted = spawnSync('bash', ['-c', 'cygpath -u "$1"', 'bash', directory], { encoding: 'utf8' })
    if (converted.status !== 0) {
      t.skip('Git Bash is required to exercise the GitHub Actions startup script on Windows.')
      return
    }
    runnerTemp = converted.stdout.trim()
  }
  const result = spawnSync('bash', ['-c', mockedWorkflow], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: {
      ...process.env,
      RUNNER_TEMP: runnerTemp,
      MOCK_FAILURES: String(failures),
      MOCK_STOP_STATUS: String(stopStatus),
      MOCK_STOP_LOG: stopLog,
      MOCK_LOG: log,
    },
  })
  const calls = (await readFile(join(directory, 'calls'), 'utf8')).trim().split('\n')
  return { ...result, calls }
}

test('startup workflow succeeds without a retry when startup succeeds', async (t) => {
  const result = await runWorkflow(t, { failures: 0, log: '' })
  if (!result) return
  assert.equal(result.status, 0, result.stderr)
  assert.deepEqual(result.calls, [
    'init',
    'start -x realtime,imgproxy,postgres-meta,studio,edge-runtime,logflare,vector,supavisor',
  ])
})

test('startup workflow retries a readiness failure once after cleanup', async (t) => {
  const secret = 'private-local-service-key'
  const result = await runWorkflow(t, {
    failures: 1,
    log: `Waiting for health checks...\nsupabase_storage_project container is not ready: unhealthy\n${secret}`,
    stopLog: secret,
  })
  if (!result) return
  assert.equal(result.status, 0, result.stderr)
  assert.deepEqual(result.calls, [
    'init',
    'start -x realtime,imgproxy,postgres-meta,studio,edge-runtime,logflare,vector,supavisor',
    'stop --no-backup',
    'sleep 10',
    'start -x realtime,imgproxy,postgres-meta,studio,edge-runtime,logflare,vector,supavisor',
  ])
  assert.match(result.stdout, /Service readiness failure \(storage\)/)
  assert.equal((result.stdout + result.stderr).includes(secret), false)
})

test('startup workflow does not retry unknown errors or print raw log text', async (t) => {
  const secret = 'private-local-service-key'
  const result = await runWorkflow(t, {
    failures: 2,
    log: `Applying migration ${secret}.sql\nunknown error: ${secret}`,
  })
  if (!result) return
  assert.equal(result.status, 1)
  assert.equal(result.calls.filter((call) => call.startsWith('start ')).length, 1)
  assert.match(result.stdout, /Cause not identified by safe diagnostics/)
  assert.equal((result.stdout + result.stderr).includes(secret), false)
})

test('startup workflow fails after a second readiness failure', async (t) => {
  const result = await runWorkflow(t, {
    failures: 2,
    log: 'supabase_auth_project container is not ready: unhealthy',
  })
  if (!result) return
  assert.equal(result.status, 1)
  assert.equal(result.calls.filter((call) => call.startsWith('start ')).length, 2)
  assert.equal(result.calls.filter((call) => call === 'stop --no-backup').length, 1)
  assert.match(result.stdout, /::error::The local Supabase stack failed to start/)
})

test('startup workflow does not retry migration errors or failed cleanup', async (t) => {
  const migration = await runWorkflow(t, {
    failures: 2,
    log: 'ERROR: migration failed (SQLSTATE 23514)\ncontext deadline exceeded',
  })
  if (!migration) return
  assert.equal(migration.status, 1)
  assert.equal(migration.calls.filter((call) => call.startsWith('start ')).length, 1)
  assert.equal(migration.calls.includes('stop --no-backup'), false)

  const cleanup = await runWorkflow(t, {
    failures: 2,
    log: 'supabase_auth_project container is not ready: unhealthy',
    stopStatus: 1,
  })
  assert.equal(cleanup.status, 1)
  assert.equal(cleanup.calls.filter((call) => call.startsWith('start ')).length, 1)
  assert.match(cleanup.stdout, /Could not clean up the disposable stack before retrying/)
})
