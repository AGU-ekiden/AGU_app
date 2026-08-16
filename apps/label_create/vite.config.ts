import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // ゲートウェイ経由で /label_create/ プレフィックス配下に配信されるため、
  // アセット参照を絶対パスではなく相対パスにする
  base: './',
  plugins: [react()],
})
