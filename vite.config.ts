import { defineConfig } from 'vite'

// GitHub Project Pages serve from https://<user>.github.io/gpu-primes/, so the
// production build needs that as its base. Dev stays at root for convenience.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/gpu-primes/' : '/',
}))
