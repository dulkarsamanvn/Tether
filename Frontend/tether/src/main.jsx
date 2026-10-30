import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { FontProvider } from './context/FontContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <FontProvider>
      <App />
    </FontProvider>
  </StrictMode>,
)
