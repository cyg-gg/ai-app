import { useState, useRef, useEffect } from 'react'
import { useI18n } from '../hooks/useI18n'
import './LanguageSwitcher.css'

export default function LanguageSwitcher() {
  const { lang, changeLanguage, languages } = useI18n()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  const currentLang = languages.find(l => l.code === lang) || languages[0]

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="lang-switcher" ref={ref}>
      <button className="lang-switcher__btn" onClick={() => setOpen(!open)} title="切换语言">
        <span className="lang-switcher__flag">{currentLang.flag}</span>
        <span className="lang-switcher__label">{currentLang.label}</span>
        <span className={`lang-switcher__arrow ${open ? 'open' : ''}`}>▼</span>
      </button>

      {open && (
        <div className="lang-switcher__dropdown">
          {languages.map(l => (
            <button
              key={l.code}
              className={`lang-switcher__option ${lang === l.code ? 'active' : ''}`}
              onClick={() => { changeLanguage(l.code); setOpen(false) }}
            >
              <span className="lang-switcher__flag">{l.flag}</span>
              <span>{l.label}</span>
              {lang === l.code && <span className="lang-switcher__check">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
