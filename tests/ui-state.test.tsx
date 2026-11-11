import assert from 'node:assert/strict'
import test from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'
import ErrorPage from '../app/error'
import { LoadingStatus } from '../components/loading-status'
import { SitePreferencesProvider } from '../components/site-preferences'

test('error and loading states provide clear recovery messages', () => {
  const error = renderToStaticMarkup(<SitePreferencesProvider><ErrorPage error={new Error('test')} reset={() => {}} /></SitePreferencesProvider>)
  assert.match(error, /Halaman belum dapat dimuat/)
  assert.match(error, /Coba lagi/)
  assert.match(error, /role="alert"/)
  assert.match(renderToStaticMarkup(<LoadingStatus className="map-loading">Memuat peta</LoadingStatus>), /role="status"/)
})
