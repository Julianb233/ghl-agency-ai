import * as esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ['server/_core/index.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outdir: 'dist',
  packages: 'external',
  external: [
    'vite',
    '@vitejs/*',
    '@tailwindcss/*',
    'tailwindcss',
    'lightningcss',
    '@builder.io/*',
    'vite-plugin-*',
    './vite.config.js',
    './vite.config.ts',
    '../vite.config.js',
    '../vite.config.ts',
    '../../vite.config.js',
    '../../vite.config.ts',
    './vite',
    './vite.js',
    './vite.ts',
  ],
});
