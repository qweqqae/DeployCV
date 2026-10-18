import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const supabaseUrl = env.VITE_SUPABASE_URL?.replace(/\/$/, '')

  return {
    plugins: [react()],
    server: {
      proxy: supabaseUrl
        ? {
            '/api/portfolio': {
              target: `${supabaseUrl}/functions/v1/portfolio-api`,
              changeOrigin: true,
              rewrite: (path) => path.replace(/^\/api\/portfolio/, ''),
            },
          }
        : undefined,
    },
  }
})
