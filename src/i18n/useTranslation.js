import { useState, useEffect } from 'react'
import { translations } from '../i18n/translations'

// Obtiene el idioma guardado o español por defecto
export function getLang() {
  return localStorage.getItem('lang') || 'es'
}

// Cambia el idioma globalmente y recarga la app
export function setLang(lang) {
  localStorage.setItem('lang', lang)
  window.location.reload()
}

// Hook principal
export function useTranslation() {
  const [lang, setLangState] = useState(getLang())

  useEffect(() => {
    setLangState(getLang())
  }, [])

  const t = (key) => {
    return translations[lang]?.[key] || translations['es']?.[key] || key
  }

  const toggleLang = () => {
    const newLang = lang === 'es' ? 'en' : 'es'
    setLang(newLang)
  }

  return { t, lang, toggleLang }
}