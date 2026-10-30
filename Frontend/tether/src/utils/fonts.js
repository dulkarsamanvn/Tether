export const FONT_STORAGE_KEY = 'tether_font'

export const FONTS = [
  { id: 'poppins', name: 'Poppins', family: "'Poppins', system-ui, sans-serif" },
  { id: 'inter', name: 'Inter', family: "'Inter', system-ui, sans-serif" },
  { id: 'roboto', name: 'Roboto', family: "'Roboto', system-ui, sans-serif", weights: [400, 500, 700, 900] },
  { id: 'open-sans', name: 'Open Sans', family: "'Open Sans', system-ui, sans-serif", weights: [400, 500, 600, 700, 800] },
  { id: 'lato', name: 'Lato', family: "'Lato', system-ui, sans-serif", weights: [400, 700, 900] },
  { id: 'montserrat', name: 'Montserrat', family: "'Montserrat', system-ui, sans-serif" },
  { id: 'nunito', name: 'Nunito', family: "'Nunito', system-ui, sans-serif" },
  { id: 'raleway', name: 'Raleway', family: "'Raleway', system-ui, sans-serif" },
  { id: 'merriweather', name: 'Merriweather', family: "'Merriweather', Georgia, serif", weights: [400, 700, 900] },
  { id: 'playfair-display', name: 'Playfair Display', family: "'Playfair Display', Georgia, serif" },
]

export function getFont(id) {
  return FONTS.find((font) => font.id === id) ?? FONTS[0]
}

export function readSavedFont() {
  try {
    return getFont(localStorage.getItem(FONT_STORAGE_KEY)).id
  } catch {
    return FONTS[0].id
  }
}

const fontLoads = new Map()

export function loadFont(id) {
  const font = getFont(id)
  if (fontLoads.has(font.id)) return fontLoads.get(font.id)

  const weights = font.weights ?? [400, 500, 600, 700, 800, 900]
  const promise = new Promise((resolve, reject) => {
    let link = document.getElementById(`tether-font-${font.id}`)
    const stylesheet = new Promise((loaded, failed) => {
      if (link?.sheet) {
        loaded()
        return
      }
      if (!link) {
        link = document.createElement('link')
        link.id = `tether-font-${font.id}`
        link.rel = 'stylesheet'
        link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(font.name)}:wght@${weights.join(';')}&display=swap`
      }
      link.onload = loaded
      link.onerror = () => failed(new Error('Font stylesheet failed to load'))
      if (!link.isConnected) document.head.appendChild(link)
    })

    const timeout = setTimeout(() => {
      link?.remove()
      reject(new Error('Font loading timed out'))
    }, 15000)

    stylesheet
      .then(() => Promise.all(weights.map((weight) => document.fonts.load(`${weight} 16px "${font.name}"`))))
      .then(() => {
        clearTimeout(timeout)
        resolve()
      })
      .catch((error) => {
        clearTimeout(timeout)
        link?.remove()
        reject(error)
      })
  }).catch((error) => {
    fontLoads.delete(font.id)
    throw error
  })

  fontLoads.set(font.id, promise)
  return promise
}

export function applyFont(id) {
  const font = getFont(id)
  document.documentElement.style.setProperty('--font-sans', font.family)
  try {
    localStorage.setItem(FONT_STORAGE_KEY, font.id)
  } catch {
    // Font selection also works when persistent browser storage is unavailable.
  }
}
