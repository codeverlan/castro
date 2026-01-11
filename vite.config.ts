import { defineConfig } from 'vite'
import tsConfigPaths from 'vite-tsconfig-paths'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  server: {
    port: 3000,
    watch: {
      // Ignore test-results and playwright-report directories
      ignored: ['**/test-results/**', '**/playwright-report/**'],
    },
  },
  plugins: [
    tsConfigPaths(),
    tanstackStart(),
    // React's vite plugin must come after TanStack Start's vite plugin
    viteReact(),
    tailwindcss(),
  ],
})
