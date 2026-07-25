import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  root: 'frontend',
  base: '/',
  build: {
    outDir: '../static',
    emptyOutDir: true,
    sourcemap: false,
  },
})
