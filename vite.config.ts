import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'

const pkg = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
) as { version: string }
export default defineConfig({
  plugins: [react()],
  base: './',
  define: {
    __BUILD_ID__: JSON.stringify(
      pkg.version + ' · ' + new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    ),
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    restoreMocks: true,
  },
})
