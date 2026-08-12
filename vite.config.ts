import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  root: 'frontend',
  base: '/',
  test: {
    environment: 'jsdom',
    setupFiles: './frontend/src/test/setup.ts',
    css: false,
  },
  build: {
    outDir: '../static',
    emptyOutDir: true,
    sourcemap: false,
  },
})
