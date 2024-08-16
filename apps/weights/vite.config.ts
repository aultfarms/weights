import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/weights/',
  plugins: [react(), basicSsl()],
  server: {
    open: true,
    port: 8080,
    https: true,
  },
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
    'process.env': {} // to avoid "Uncaught ReferenceError: process is not defined"
  },
});