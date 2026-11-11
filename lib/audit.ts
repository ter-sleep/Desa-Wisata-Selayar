import 'server-only'

import type { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'

type AuditEntry = Database['public']['Tables']['audit_logs']['Insert']

export async function recordAudit(
  supabase: Awaited<ReturnType<typeof createClient>>,
  entry: AuditEntry,
): Promise<void> {
  const { error } = await supabase.from('audit_logs').insert(entry)
  if (error) {
    console.error('Gagal mencatat audit.', { action: entry.action, code: error.code })
  }
}
