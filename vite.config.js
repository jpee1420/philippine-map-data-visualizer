import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  base: '/philippine-map-data-visualizer/',
  plugins: [vue()],
  build: {
    sourcemap: false,
  },
  css: {
    devSourcemap: false
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    port: 3000
  },
  esbuild: {
    sourcemap: false,
    // drop: ["console", "debugger"]
  }

})
