import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages serves the project from /<repo>/ — the base path must match
// the repository name so asset URLs resolve in production. For a custom
// domain or user/org pages site, set this back to '/'.
const repo = 'AI-Mission-Capital-Planning-OS';

export default defineConfig({
  base: `/${repo}/`,
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
