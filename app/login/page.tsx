import type { Metadata } from 'next'
import { LoginForm } from '@/components/auth/login-form'
import { isSupabaseConfigured } from '@/lib/supabase/env'

export const metadata: Metadata = {
  title: 'Login Pengelola | Bontomarannu',
  description: 'Masuk ke dashboard pengelola Desa Wisata Bontomarannu.',
  robots: { index: false, follow: false },
}

type LoginPageProps = {
  searchParams: Promise<{ error?: string; status?: string }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams
  return <LoginForm error={params.error} status={params.status} configured={isSupabaseConfigured()} />
}
