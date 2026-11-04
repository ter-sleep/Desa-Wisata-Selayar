'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { isSupabaseConfigured } from '@/lib/supabase/env'

function text(formData: FormData, key: string) {
  const value = formData.get(key)
  return typeof value === 'string' ? value.trim() : ''
}

function localTodayMakassar() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Makassar', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date())
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

function validEmail(value: string) {
  return !value || (value.length <= 254 && /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(value))
}

function reservationError(message: string): never {
  redirect(`/reservasi?error=${encodeURIComponent(message)}`)
}

function contactError(message: string): never {
  redirect(`/kontak?error=${encodeURIComponent(message)}`)
}

export async function submitReservation(formData: FormData) {
  // Honeypot: bot sederhana yang mengisi field tersembunyi tidak diproses.
  if (text(formData, 'website')) redirect('/reservasi?status=received')
  if (!isSupabaseConfigured()) reservationError('Layanan reservasi belum dikonfigurasi. Silakan hubungi pengelola.')

  const destinationId = text(formData, 'destination_id')
  const visitorName = text(formData, 'visitor_name')
  const email = text(formData, 'email')
  const whatsapp = text(formData, 'whatsapp')
  const visitDate = text(formData, 'visit_date')
  const participantText = text(formData, 'participant_count')
  const visitorNotes = text(formData, 'visitor_notes')
  const privacyConsent = text(formData, 'privacy_consent') === 'on'

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(destinationId)) {
    reservationError('Pilih destinasi yang tersedia.')
  }
  if (visitorName.length < 2 || visitorName.length > 120) reservationError('Nama harus terdiri dari 2–120 karakter.')
  if (!validEmail(email)) reservationError('Format email tidak valid.')
  if (whatsapp.replace(/[^0-9+]/g, '').length < 8 || whatsapp.replace(/[^0-9+]/g, '').length > 20) {
    reservationError('Masukkan nomor WhatsApp yang valid, termasuk kode negara bila diperlukan.')
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(visitDate) || visitDate < localTodayMakassar()) {
    reservationError('Pilih tanggal kunjungan hari ini atau tanggal mendatang.')
  }
  const participants = Number(participantText)
  if (!Number.isInteger(participants) || participants < 1 || participants > 500) {
    reservationError('Jumlah peserta harus antara 1 dan 500 orang.')
  }
  if (visitorNotes.length > 1000) reservationError('Catatan maksimal 1.000 karakter.')
  if (!privacyConsent) reservationError('Persetujuan pemrosesan data wajib dicentang.')

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('submit_public_reservation', {
    p_destination_id: destinationId,
    p_visitor_name: visitorName,
    p_email: email || null,
    p_whatsapp: whatsapp,
    p_visit_date: visitDate,
    p_participant_count: participants,
    p_visitor_notes: visitorNotes || null,
    p_privacy_consent: privacyConsent,
  })

  if (error) {
    const message = error.message.includes('Destinasi tidak tersedia')
      ? 'Destinasi tidak tersedia untuk reservasi.'
      : error.message.includes('Tanggal kunjungan')
        ? 'Tanggal kunjungan tidak boleh berada di masa lalu.'
        : error.message.includes('Jumlah peserta')
          ? 'Jumlah peserta harus antara 1 dan 500 orang.'
          : error.message.includes('Persetujuan')
            ? 'Persetujuan pemrosesan data wajib diberikan.'
            : error.message.includes('Nama')
              ? 'Nama harus terdiri dari 2–120 karakter.'
              : error.message.includes('WhatsApp')
                ? 'Nomor WhatsApp tidak valid.'
                : error.message.includes('email') || error.message.includes('Email')
                  ? 'Format email tidak valid.'
                  : 'Reservasi belum dapat disimpan. Silakan coba kembali atau hubungi pengelola.'
    reservationError(message)
  }

  const bookingCode = data?.[0]?.booking_code
  if (!bookingCode) reservationError('Permintaan mungkin belum tercatat. Silakan periksa kembali atau hubungi pengelola.')

  revalidatePath('/admin')
  revalidatePath('/admin/reservasi')
  redirect(`/reservasi?status=sent&code=${encodeURIComponent(bookingCode)}`)
}

export async function submitContactMessage(formData: FormData) {
  if (text(formData, 'website')) redirect('/kontak?status=received')
  if (!isSupabaseConfigured()) contactError('Formulir kontak belum dikonfigurasi. Silakan hubungi pengelola melalui kanal resmi.')

  const visitorName = text(formData, 'visitor_name')
  const email = text(formData, 'email')
  const phone = text(formData, 'phone')
  const subject = text(formData, 'subject')
  const message = text(formData, 'message')
  const privacyConsent = text(formData, 'privacy_consent') === 'on'

  if (visitorName.length < 2 || visitorName.length > 120) contactError('Nama harus terdiri dari 2–120 karakter.')
  if (!validEmail(email)) contactError('Format email tidak valid.')
  if (phone.length > 30) contactError('Nomor telepon maksimal 30 karakter.')
  if (subject.length > 160) contactError('Subjek maksimal 160 karakter.')
  if (message.length < 5 || message.length > 5000) contactError('Pesan harus terdiri dari 5–5.000 karakter.')
  if (!privacyConsent) contactError('Persetujuan pemrosesan data wajib dicentang.')

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('submit_public_contact_message', {
    p_visitor_name: visitorName,
    p_email: email || null,
    p_phone: phone || null,
    p_subject: subject || null,
    p_message: message,
    p_privacy_consent: privacyConsent,
  })

  if (error || data !== true) contactError('Pesan belum dapat dikirim. Silakan coba kembali atau hubungi pengelola.')
  revalidatePath('/admin')
  revalidatePath('/admin/pesan')
  redirect('/kontak?status=sent')
}
