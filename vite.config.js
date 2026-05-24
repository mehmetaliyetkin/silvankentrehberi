import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/tkgm-api": {
        target: "https://cbsservis.tkgm.gov.tr",
        changeOrigin: true,
        rewrite: path => path.replace(/^\/tkgm-api/, ""),
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          ol:       ["ol"],
          react:    ["react", "react-dom"],
          supabase: ["@supabase/supabase-js"],
        },
      },
    },
  },
})