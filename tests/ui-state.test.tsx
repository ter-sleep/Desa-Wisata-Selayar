import assert from 'node:assert/strict'
import test from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'
import ErrorPage from '../app/error'
import NotFound from '../app/not-found'
import { LoadingStatus } from '../components/loading-status'

test('error, loading, and not-found states provide clear recovery messages', () => {
  const error = renderToStaticMarkup(<ErrorPage error={new Error('test')} reset={() => {}} />)
  assert.match(error, /Halaman belum dapat dimuat/)
  assert.match(error, /Coba lagi/)
  assert.match(error, /role="alert"/)
  assert.match(renderToStaticMarkup(<LoadingStatus className="map-loading">Memuat peta</LoadingStatus>), /role="status"/)
  assert.match(renderToStaticMarkup(<NotFound />), /Halaman belum tersedia/)
})
