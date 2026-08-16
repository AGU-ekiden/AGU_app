import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  // ゲートウェイ経由で /ryouhi/ プレフィックス配下に配信されるため、
  // アセット参照を絶対パスではなく相対パスにする
  base: './',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
