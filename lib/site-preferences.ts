import 'server-only'

import { cookies } from 'next/headers'
import { languageCookie, localizeContent, parseLanguage, parseTheme, themeCookie, translate, type Message } from '@/lib/i18n'

export async function getSitePreferences() {
  const cookieStore = await cookies()
  return {
    language: parseLanguage(cookieStore.get(languageCookie)?.value),
    themePreference: parseTheme(cookieStore.get(themeCookie)?.value),
  }
}

export async function getTranslator() {
  const { language } = await getSitePreferences()
  return {
    language,
    t: (message: Message, parameters?: Record<string, string | number>) => translate(language, message, parameters),
    content: (text: string) => localizeContent(language, text),
  }
}
