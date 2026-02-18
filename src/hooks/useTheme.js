import { useState, useEffect } from 'react'

const HLJS_BASE = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/'

export function useTheme() {
  const [theme, setTheme] = useState(
    () => localStorage.getItem('pf-theme') || 'light'
  )

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('pf-theme', theme)
    const link = document.getElementById('hljs-theme')
    if (link) {
      link.href = HLJS_BASE + (theme === 'dark' ? 'github-dark.min.css' : 'github.min.css')
    }
  }, [theme])

  const toggleTheme = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'))

  return { theme, toggleTheme }
}
