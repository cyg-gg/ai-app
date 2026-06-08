import { useState, useCallback, useEffect, createContext, useContext } from 'react'
import zh from '../i18n/zh.json'
import en from '../i18n/en.json'
import ja from '../i18n/ja.json'

const translations = { zh, en, ja }
const LANGUAGES = [
  { code: 'zh', label: '中文', flag: '🇨🇳' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
]

function getNestedValue(obj, path) {
  return path.split('.').reduce((acc, key) => acc?.[key], obj)
}

const I18nContext = createContext(null)

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(() => {
    return localStorage.getItem('app_language') || 'zh'
  })

  useEffect(() => {
    localStorage.setItem('app_language', lang)
    document.documentElement.lang = lang
  }, [lang])

  const t = useCallback((key, fallback = '') => {
    const translation = translations[lang] || translations.zh
    const value = getNestedValue(translation, key)
    return value || fallback || key
  }, [lang])

  const changeLanguage = useCallback((newLang) => {
    if (translations[newLang]) {
      setLang(newLang)
    }
  }, [])

  return (
    <I18nContext.Provider value={{ t, lang, changeLanguage, languages: LANGUAGES }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider')
  }
  return context
}
