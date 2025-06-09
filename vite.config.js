import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/claim-map/', // This line is key
  plugins: [react()],
});
