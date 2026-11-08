import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;

          if (id.includes('/@supabase/')) return 'supabase-vendor';
          if (id.includes('/@react-oauth/')) return 'google-auth-vendor';
          if (id.includes('/framer-motion/')) return 'motion-vendor';
          if (id.includes('/lucide-react/')) return 'icons-vendor';
          if (id.includes('/react-router')) return 'router-vendor';
          if (id.includes('/react-dom/') || id.includes('/react/')) return 'react-vendor';

          return undefined;
        },
      },
    },
  },
});
