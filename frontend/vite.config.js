import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

// https://vite.dev/config/
const projectRoot = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  plugins: [react(), tailwindcss()],
  publicDir: 'public-meta',
  build: {
    rollupOptions: {
      input: {
        app: resolve(projectRoot, 'index.html'),
        agpeyaReader: resolve(projectRoot, 'agpeya-reader.html'),
      },
    },
  },
})
