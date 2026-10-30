import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { applyFont, getFont, loadFont, readSavedFont } from '../utils/fonts'

const FontContext = createContext(null)

export function FontProvider({ children }) {
  const [font, setFont] = useState(readSavedFont)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const requestRef = useRef({ version: 0 })

  useEffect(() => {
    const savedFont = readSavedFont()
    const requests = requestRef.current
    const request = ++requests.version
    loadFont(savedFont)
      .then(() => {
        if (request !== requests.version) return
        applyFont(savedFont)
        setFont(savedFont)
        setLoading(false)
      })
      .catch(() => {
        if (request !== requests.version) return
        applyFont('poppins')
        setFont('poppins')
        setLoading(false)
        setError('Could not load your saved font. You can choose another font.')
      })
    return () => { requests.version++ }
  }, [])

  async function selectFont(id) {
    const nextFont = getFont(id)
    const requests = requestRef.current
    const request = ++requests.version
    setLoading(true)
    setError('')
    try {
      await loadFont(nextFont.id)
      // Let the picker close and restore focus before the page changes its font.
      await new Promise(requestAnimationFrame)
      if (request !== requests.version) return
      applyFont(nextFont.id)
      setFont(nextFont.id)
    } catch {
      if (request === requests.version) setError('Could not load that font. Please try again.')
    } finally {
      if (request === requests.version) setLoading(false)
    }
  }

  return (
    <FontContext.Provider value={{ font, setFont: selectFont, loading, error }}>
      {children}
    </FontContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useFont = () => useContext(FontContext)
