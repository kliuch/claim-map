 import { defineConfig } from 'vite';
 import react from '@vitejs/plugin-react';

 // https://vitejs.dev/config/
 export default defineConfig({
   base: '/claim-map/',
   plugins: [react()],
   build: {
     outDir: 'docs'
   }
 });