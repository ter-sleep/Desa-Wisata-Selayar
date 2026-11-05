import assert from 'node:assert/strict'
import test from 'node:test'
import {
  isValidVisitDate,
  isValidWhatsApp,
  messageTransitions,
  reservationTransitions,
  toWhatsAppDigits,
} from '../lib/visitor-rules'

test('reservation phone numbers contain a usable number and only permitted formatting', () => {
  for (const phone of ['081234567890', '+62 812-3456-7890', '(0812) 3456 7890', '12345678', '1'.repeat(20)]) {
    assert.equal(isValidWhatsApp(phone), true, phone)
  }
  for (const phone of ['', '+++++++', '+1234567', '1234567', '1234abc5678', '12+345678', `+${'1'.repeat(20)}`, `1${' '.repeat(30)}2345678`]) {
    assert.equal(isValidWhatsApp(phone), false, phone)
  }
})

test('visit dates must be real calendar dates and not be in the past', () => {
  assert.equal(isValidVisitDate('2028-02-29', '2028-02-29'), true)
  assert.equal(isValidVisitDate('2028-03-01', '2028-02-29'), true)
  for (const date of ['2028-02-28', '2027-02-29', '2028-04-31', '2028-13-01', '0000-01-01', '2028-2-29']) {
    assert.equal(isValidVisitDate(date, '2028-02-29'), false, date)
  }
})

test('WhatsApp links normalize local numbers without inventing a number', () => {
  assert.equal(toWhatsAppDigits('0812 3456 7890'), '6281234567890')
  assert.equal(toWhatsAppDigits('812-3456-7890'), '6281234567890')
  assert.equal(toWhatsAppDigits('+62 812 3456 7890'), '6281234567890')
  assert.equal(toWhatsAppDigits(''), '')
})

test('status transitions match the operational workflow', () => {
  assert.deepEqual(reservationTransitions, {
    pending: ['confirmed', 'rejected', 'cancelled'],
    confirmed: ['cancelled', 'completed'],
    rejected: [],
    cancelled: [],
    completed: [],
  })
  assert.deepEqual(messageTransitions, {
    new: ['read', 'archived'],
    read: ['replied', 'archived'],
    replied: ['archived'],
    archived: ['read'],
  })
})
