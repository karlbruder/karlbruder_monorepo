import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), ['VITE_', 'API_PROXY_TARGET'])

  if (command === 'build') {
    const required = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY']
    const missing = required.filter((name) => !env[name]?.trim())
    if (missing.length) {
      throw new Error(`Missing required frontend environment variables: ${missing.join(', ')}`)
    }
    if (!env.VITE_SUPABASE_PUBLISHABLE_KEY.startsWith('sb_publishable_') ||
        env.VITE_SUPABASE_PUBLISHABLE_KEY === 'sb_publishable_') {
      throw new Error('VITE_SUPABASE_PUBLISHABLE_KEY must be an sb_publishable_ key. Legacy anon and server-only secret keys are not accepted.')
    }
  }

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      proxy: {
        '/api': {
          target: env.API_PROXY_TARGET || 'http://localhost:8000',
          changeOrigin: true,
        },
      },
    },
  }
})
