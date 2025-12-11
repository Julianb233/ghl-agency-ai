import * as esbuild from 'esbuild';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Custom plugin to resolve path aliases
const aliasPlugin = {
  name: 'alias',
  setup(build) {
    // Handle @/server/* -> ./server/*
    build.onResolve({ filter: /^@\/server\// }, args => {
      const resolved = args.path.replace('@/server/', '');
      const fullPath = path.resolve(__dirname, 'server', resolved);
      // Try with .ts extension first
      return {
        path: fullPath + '.ts',
      };
    });

    // Handle @/drizzle/* -> ./drizzle/*
    build.onResolve({ filter: /^@\/drizzle\// }, args => {
      const resolved = args.path.replace('@/drizzle/', '');
      const fullPath = path.resolve(__dirname, 'drizzle', resolved);
      // Try with .ts extension first
      return {
        path: fullPath + '.ts',
      };
    });

    // Replace pino-pretty with stub to prevent serverless errors
    build.onResolve({ filter: /^pino-pretty$/ }, () => {
      return {
        path: path.resolve(__dirname, 'stubs', 'pino-pretty', 'index.js'),
      };
    });
  },
};

await esbuild.build({
  entryPoints: ['server/_core/index.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outdir: 'dist',
  packages: 'external',
  external: [
    'vite', 
    '@tailwindcss/*', 
    'tailwindcss', 
    'lightningcss',
    // Don't externalize pino - let it be bundled or handled by packages: 'external'
  ],
  plugins: [aliasPlugin],
});

console.log('Build completed successfully');
