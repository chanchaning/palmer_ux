import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/core.css'
import App from './App'
import { MotionProvider } from './lib/motion'

/* 본문 드래그·복사 막기 — 입력칸과 선택 데모(.allow-select)는 예외. 코드 '복사' 버튼은 클립보드 API라 그대로 동작해요. */
const canSelect = (t: EventTarget | null) => t instanceof Element && !!t.closest('input, textarea, [contenteditable="true"], .allow-select, [draggable="true"]')
for (const ev of ['copy', 'cut', 'dragstart', 'selectstart'] as const)
  document.addEventListener(ev, e => { if (!canSelect(e.target instanceof Text ? e.target.parentElement : e.target)) e.preventDefault() })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MotionProvider>
      <App />
    </MotionProvider>
  </StrictMode>,
)
