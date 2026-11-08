import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/core.css'
import App from './App'
import { MotionProvider } from './lib/motion'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MotionProvider>
      <App />
    </MotionProvider>
  </StrictMode>,
)
