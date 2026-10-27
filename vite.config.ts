import path from 'path';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => ({
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react(), {
        name: 'noosh-recipe-data-asset',
        generateBundle(_options, bundle) {
          const source = readFileSync(path.resolve(__dirname, 'data/recipes_overrides.json'));
          this.emitFile({ type: 'asset', fileName: 'data/recipes_overrides.json', source });
          const runtimeAssets = Object.values(bundle)
            .filter(file => file.type === 'chunk' || (file.type === 'asset' && file.fileName.endsWith('.css')))
            .map(file => `/${file.fileName}`);
          runtimeAssets.push('/data/recipes_overrides.json');
          this.emitFile({ type: 'asset', fileName: 'sw-precache.json', source: JSON.stringify({ assets: runtimeAssets }) });
        }
      }],
      build: {
        rollupOptions: {
          output: {
            manualChunks(id) {
              if (!id.includes('node_modules')) return;
              if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/scheduler/')) return 'vendor-react';
              if (id.includes('/lucide-react/')) return 'vendor-icons';
              if (id.includes('/xlsx/')) return 'vendor-spreadsheets';
              if (id.includes('/motion/')) return 'vendor-motion';
            }
          }
        }
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    }
));
