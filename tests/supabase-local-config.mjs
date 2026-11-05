import { readFile } from 'node:fs/promises'

function localApiOrigin(apiUrl) {
  if (typeof apiUrl !== 'string' || !URL.canParse(apiUrl)) {
    throw new Error('Local Supabase API URL is invalid.')
  }
  const url = new URL(apiUrl)
  if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || !url.port ||
      url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('Integration tests only allow an unlinked HTTP API on 127.0.0.1 with an explicit port.')
  }
  return url.origin
}

export function localSupabaseConfig(status) {
  if (!status || typeof status !== 'object' || Array.isArray(status)) {
    throw new Error('Local Supabase status must be a JSON object.')
  }
  const { API_URL: apiUrl, ANON_KEY: anonKey, SERVICE_ROLE_KEY: serviceKey } = status
  if (typeof apiUrl !== 'string' || typeof anonKey !== 'string' || !anonKey ||
      typeof serviceKey !== 'string' || !serviceKey) {
    throw new Error('Local Supabase status is missing the API URL or keys.')
  }
  if (status.linked_project_ref || status.linked_parent_project_ref) {
    throw new Error('Integration tests require an unlinked, disposable local Supabase project.')
  }
  return { url: localApiOrigin(apiUrl), anonKey, serviceKey }
}

export async function readLocalSupabaseConfig(path) {
  if (!path) throw new Error('Set DEWIS_SUPABASE_STATUS_FILE to the local Supabase status JSON file.')
  let contents
  try {
    contents = await readFile(path, 'utf8')
  } catch (error) {
    throw new Error(`Cannot read local Supabase status file (${error.code || 'read error'}).`)
  }
  let status
  try {
    status = JSON.parse(contents)
  } catch {
    throw new Error('Local Supabase status file does not contain valid JSON.')
  }
  return localSupabaseConfig(status)
}

export function localOnlyFetch(origin) {
  const localOrigin = localApiOrigin(origin)
  return (input, init) => {
    const target = input instanceof Request ? input.url : String(input)
    if (!URL.canParse(target) || new URL(target).origin !== localOrigin) {
      throw new Error('Integration tests refuse requests outside the local Supabase API.')
    }
    return fetch(input, { ...init, redirect: 'error' })
  }
}

export function guardedIntegrationFetch(apiOrigin, appOrigin, fetchImpl = globalThis.fetch) {
  const api = localApiOrigin(apiOrigin)
  const app = localApiOrigin(appOrigin)
  return (input, init) => {
    const target = input instanceof Request ? input.url : String(input)
    if (!URL.canParse(target)) throw new Error('Integration tests refuse an invalid request URL.')
    const origin = new URL(target).origin
    if (origin !== api && origin !== app) {
      throw new Error('Integration tests refuse requests outside the local services.')
    }
    return fetchImpl(input, { ...init, redirect: origin === api ? 'error' : 'manual' })
  }
}
