import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { SitePreferencesProvider } from '@/components/site-preferences'
import { getSitePreferences } from '@/lib/site-preferences'
import './globals.css'
import './map.css'
import './site.css'

export async function generateMetadata(): Promise<Metadata> {
  const { language } = await getSitePreferences()
  return {
    title: language === 'en' ? 'Bontomarannu — Selayar Tourism Village' : 'Bontomarannu — Desa Wisata Selayar',
    description: language === 'en'
      ? 'Discover nature, trace history, and explore Bontomarannu Tourism Village in the Selayar Islands.'
      : 'Temukan alam, telusuri sejarah, dan kenali Desa Wisata Bontomarannu di Kepulauan Selayar.',
    generator: 'v0.app',
  }
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: '#123f36',
}

const initializeTheme = `(function(){var match=document.cookie.match(/(?:^|; )dewis-theme=(light|dark)(?:;|$)/);var dark=match?match[1]==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.dataset.theme=dark?'dark':'light';document.documentElement.classList.toggle('dark',dark);})();`

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const { language, themePreference } = await getSitePreferences()
  return (
    <html lang={language} className={themePreference === 'dark' ? 'dark' : undefined} data-theme={themePreference === 'dark' ? 'dark' : 'light'} suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: initializeTheme }} /></head>
      <body className="antialiased">
        <SitePreferencesProvider initialLanguage={language} initialTheme={themePreference}>
          {children}
        </SitePreferencesProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
