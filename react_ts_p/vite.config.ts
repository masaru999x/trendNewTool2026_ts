import { resolve } from "node:path";
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: "C:/laragon/www/",
    emptyOutDir: false,
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        trend: resolve(__dirname, "trend_notice.html")
      },
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost",
        changeOrigin: true,
      },
    },
  },
})
