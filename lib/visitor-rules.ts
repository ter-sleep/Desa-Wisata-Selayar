import type { MessageStatus, ReservationStatus } from '@/types/database'

export const reservationTransitions: Record<ReservationStatus, readonly ReservationStatus[]> = {
  pending: ['confirmed', 'rejected', 'cancelled'],
  confirmed: ['cancelled', 'completed'],
  rejected: [],
  cancelled: [],
  completed: [],
}

export const messageTransitions: Record<MessageStatus, readonly MessageStatus[]> = {
  new: ['read', 'archived'],
  read: ['replied', 'archived'],
  replied: ['archived'],
  archived: ['read'],
}

export function isValidWhatsApp(value: string): boolean {
  if (value.length > 30 || !/^\+?[0-9(][0-9 ()-]*$/.test(value)) return false
  const digits = value.replace(/\D/g, '')
  return digits.length >= 8 && digits.length + Number(value.startsWith('+')) <= 20
}

export function isValidVisitDate(value: string, today: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return false
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
  const daysInMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  return year > 0 && month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth[month - 1] && value >= today
}

export function toWhatsAppDigits(value: string): string {
  const digits = value.replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('0')) return `62${digits.slice(1)}`
  if (digits.startsWith('8')) return `62${digits}`
  return digits
}
