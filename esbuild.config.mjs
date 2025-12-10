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
      return {
        path: path.resolve(__dirname, 'server', resolved),
      };
    });

    // Handle @/drizzle/* -> ./drizzle/*
    build.onResolve({ filter: /^@\/drizzle\// }, args => {
      const resolved = args.path.replace('@/drizzle/', '');
      return {
        path: path.resolve(__dirname, 'drizzle', resolved),
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
  external: ['vite', '@tailwindcss/*', 'tailwindcss', 'lightningcss'],
  plugins: [aliasPlugin],
});

console.log('Build completed successfully');
