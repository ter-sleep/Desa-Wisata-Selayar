#!/usr/bin/env bash
set -euo pipefail
umask 077
supabase init
for attempt in 1 2; do
  if supabase start -x realtime,imgproxy,postgres-meta,studio,edge-runtime,logflare,vector,supavisor >"$RUNNER_TEMP/dewis-supabase-start.log" 2>&1; then
    break
  fi
  echo "::warning::Supabase startup attempt $attempt failed. Raw output is withheld because it may contain local credentials."
  retryable=0
  if node tests/supabase-start-diagnostics.mjs "$RUNNER_TEMP/dewis-supabase-start.log"; then
    retryable=1
  fi
  if [ "$attempt" -eq 2 ] || [ "$retryable" -eq 0 ]; then
    echo "::error::The local Supabase stack failed to start."
    exit 1
  fi
  echo "::warning::Retrying a recognized infrastructure startup failure with a fresh disposable stack."
  if ! supabase stop --no-backup >"$RUNNER_TEMP/dewis-supabase-stop.log" 2>&1; then
    echo "::error::Could not clean up the disposable stack before retrying."
    exit 1
  fi
  sleep 10
done
