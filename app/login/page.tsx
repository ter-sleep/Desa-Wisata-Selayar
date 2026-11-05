import type { Metadata } from 'next'
import { LoginForm } from '@/components/auth/login-form'
import { isSupabaseConfigured } from '@/lib/supabase/env'
import { Header } from '@/components/site'
import { getTranslator } from '@/lib/site-preferences'

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator()
  return {
    title: t('Login Pengelola | Bontomarannu'),
    description: t('Masuk ke dashboard pengelola Desa Wisata Bontomarannu.'),
    robots: { index: false, follow: false },
  }
}

type LoginPageProps = {
  searchParams: Promise<{ error?: string; status?: string }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams
  return <><Header /><LoginForm error={params.error} status={params.status} configured={isSupabaseConfigured()} /></>
}
