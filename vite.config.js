import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['capacitor-google-fit']
  },
  build: {
    rollupOptions: {
      external: ['capacitor-google-fit']
    }
  },
  define: {
    'process.env': {}
  }
})