import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      // Sirf 'capacitor-google-fit' ko external rakho, core ko nahi
      external: ['capacitor-google-fit']
    }
  },
  // Yeh ensure karega ki web build mein koi error na aaye
  define: {
    'process.env': {}
  }
})