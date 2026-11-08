import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// GitHub Pages(https://<user>.github.io/palmer_ux/)에서도 동작하도록 상대 경로로 빌드
export default defineConfig({
  base: './',
  plugins: [react()],
})
