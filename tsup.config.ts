import { defineConfig } from 'tsup';

export default defineConfig([
  // React components entry — carries the 'use client' banner.
  {
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    splitting: false,
    sourcemap: true,
    clean: true,
    external: ['react', 'react-dom'],
    banner: { js: "'use client';" },
  },
  // buildScript entry — framework-agnostic, SERVER-SAFE (no 'use client' banner,
  // no React). Consumed by server route handlers / static HTML / React wrappers.
  {
    entry: { 'build-script': 'src/buildScript.ts' },
    format: ['esm', 'cjs'],
    dts: true,
    splitting: false,
    sourcemap: true,
    clean: false,
  },
]);
