import { defineConfig, type Plugin, type Rollup } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import path from 'path';
import { fileURLToPath } from 'url';
import tailwindConfig from './tailwind.config.js';

/**
 * Standalone Game Arcade player for the "Download offline HTML" export.
 * Builds src/arcade-standalone into ONE self-contained file, public/arcade-player/template.html,
 * which the main build then copies to dist/. The app fills in the question pack at download time.
 * Every game rendered by GameArcade is bundled, so new games are included automatically.
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, 'src/arcade-standalone');

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Inlines the entry script and stylesheet into the HTML so the file works offline from file://. */
function inlineIntoHtml(): Plugin {
  return {
    name: 'arcade-inline-single-file',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const htmlFile = Object.values(bundle).find(
        (file): file is Rollup.OutputAsset => file.type === 'asset' && file.fileName.endsWith('.html'),
      );
      if (!htmlFile) return;
      let html = String(htmlFile.source);
      for (const [key, file] of Object.entries(bundle)) {
        if (file.type === 'chunk') {
          const chunk = file as Rollup.OutputChunk;
          const tag = new RegExp(`<script type="module" crossorigin src="[^"]*${escapeRegExp(chunk.fileName)}"></script>`);
          const code = chunk.code.replace(/<\/script/gi, '<\\/script');
          html = html.replace(tag, () => `<script type="module">${code}</script>`);
          delete bundle[key];
        } else if (file.fileName.endsWith('.css')) {
          const tag = new RegExp(`<link rel="stylesheet" crossorigin href="[^"]*${escapeRegExp(file.fileName)}">`);
          html = html.replace(tag, () => `<style>${String(file.source)}</style>`);
          delete bundle[key];
        }
      }
      htmlFile.source = html;
    },
  };
}

export default defineConfig({
  root,
  base: './',
  publicDir: false,
  plugins: [react(), inlineIntoHtml()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@brightpath/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
    },
  },
  css: {
    postcss: {
      plugins: [
        tailwindcss({
          ...tailwindConfig,
          content: [
            path.join(root, '**/*.{html,ts,tsx}'),
            path.resolve(__dirname, 'src/components/games/arcade/**/*.{ts,tsx}'),
            path.resolve(__dirname, 'src/components/tools/toolTheme.ts'),
          ],
        }),
        autoprefixer(),
      ],
    },
  },
  build: {
    outDir: path.resolve(__dirname, 'public/arcade-player'),
    emptyOutDir: true,
    target: 'es2020',
    cssCodeSplit: false,
    modulePreload: false,
    assetsInlineLimit: () => true,
    reportCompressedSize: false,
    rollupOptions: {
      input: path.join(root, 'template.html'),
      output: { inlineDynamicImports: true },
    },
  },
});
