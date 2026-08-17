import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const deviceApiTarget = loadEnv(mode, '.', '').DEVICE_API_TARGET || 'http://123.56.41.166'

  return {
    plugins: [react(), tailwindcss()],
    root: 'frontend',
    envDir: '..',
    base: '/',
    resolve: {
      alias: { '@': new URL('./frontend/src', import.meta.url).pathname },
    },
    server: deviceApiTarget ? {
      proxy: {
        '/api': {
          target: deviceApiTarget,
          changeOrigin: true,
        },
      },
    } : undefined,
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
  }
})
