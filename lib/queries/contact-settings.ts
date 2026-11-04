import 'server-only'

import { isSupabaseConfigured } from '@/lib/supabase/env'
import { createClient } from '@/lib/supabase/server'

type PublicContactSettings = { whatsappNumber: string; publicAddress: string }

function jsonString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export async function getPublicContactSettings(): Promise<PublicContactSettings> {
  if (!isSupabaseConfigured()) return { whatsappNumber: '', publicAddress: '' }
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('site_settings')
    .select('key, value')
    .in('key', ['whatsapp_number', 'public_address'])
    .eq('is_public', true)

  if (error) return { whatsappNumber: '', publicAddress: '' }
  const values = new Map((data || []).map((row) => [row.key, row.value] as const))
  return {
    whatsappNumber: jsonString(values.get('whatsapp_number')),
    publicAddress: jsonString(values.get('public_address')),
  }
}

export function toWhatsAppDigits(value: string): string {
  const digits = value.replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('0')) return `62${digits.slice(1)}`
  if (digits.startsWith('8')) return `62${digits}`
  return digits
}
