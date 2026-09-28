import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
export default defineConfig({ plugins: [react()], server: { port: 5173, strictPort: true, proxy: { '/web': 'http://localhost:5000' } }, test: { environment: 'jsdom', include: ['src/**/*.test.ts', 'src/**/*.test.tsx'], restoreMocks: true } })
