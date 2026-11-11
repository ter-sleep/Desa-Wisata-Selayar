'use client'

import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react'
import { languageCookie, localizeContent, themeCookie, translate, type Language, type Message, type ThemePreference } from '@/lib/i18n'

type SitePreferences = {
  language: Language
  theme: 'light' | 'dark'
  setLanguage: (language: Language) => void
  setTheme: (theme: 'light' | 'dark') => void
  t: (message: Message, parameters?: Record<string, string | number>) => string
  content: (text: string) => string
}

const PreferencesContext = createContext<SitePreferences | null>(null)

function subscribeToSystemTheme(callback: () => void) {
  const media = window.matchMedia('(prefers-color-scheme: dark)')
  media.addEventListener('change', callback)
  return () => media.removeEventListener('change', callback)
}

function systemUsesDarkTheme() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function savePreference(name: string, value: string) {
  document.cookie = `${name}=${value}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`
}

export function SitePreferencesProvider({
  children,
  initialLanguage = 'id',
  initialTheme = 'system',
}: {
  children: ReactNode
  initialLanguage?: Language
  initialTheme?: ThemePreference
}) {
  const [language, updateLanguage] = useState(initialLanguage)
  const [themePreference, updateTheme] = useState(initialTheme)
  const systemDark = useSyncExternalStore(subscribeToSystemTheme, systemUsesDarkTheme, () => false)
  const theme = themePreference === 'system' ? (systemDark ? 'dark' : 'light') : themePreference

  useEffect(() => {
    document.documentElement.lang = language
    document.documentElement.dataset.theme = theme
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [language, theme])

  return (
    <PreferencesContext.Provider value={{
      language,
      theme,
      setLanguage(next) { savePreference(languageCookie, next); updateLanguage(next) },
      setTheme(next) { savePreference(themeCookie, next); updateTheme(next) },
      t: (message, parameters) => translate(language, message, parameters),
      content: (text) => localizeContent(language, text),
    }}>
      {children}
    </PreferencesContext.Provider>
  )
}

export function useSitePreferences() {
  const preferences = useContext(PreferencesContext)
  if (!preferences) throw new Error('Site preferences require SitePreferencesProvider.')
  return preferences
}
