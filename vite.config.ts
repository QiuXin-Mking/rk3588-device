import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const deviceApiTarget = loadEnv(mode, '.', '').DEVICE_API_TARGET || 'http://123.56.41.166'
  const managementApiTarget = process.env.MANAGEMENT_API_TARGET || loadEnv(mode, '.', '').MANAGEMENT_API_TARGET || 'http://127.0.0.1:8010'

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
        '/management-api': {
          target: managementApiTarget,
          changeOrigin: true,
          rewrite: path => path.replace(/^\/management-api/, '/api'),
        },
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
