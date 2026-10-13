import { defineConfig } from 'vite';
import wasmPlugin from 'vite-plugin-wasm';

/*
 * Desk terminal build. The page imports the managed covenant contract from
 * ../contract, and compact-runtime loads its onchain runtime as wasm, which
 * needs top-level await (es2022) and must not be pre-bundled.
 */
export default defineConfig(({ command }) => ({
  base: './',
  plugins: [wasmPlugin()],
  esbuild: { target: 'es2022' },
  build: { target: 'es2022', outDir: '../dist', emptyOutDir: true, sourcemap: command === 'build' ? false : true },
  optimizeDeps: {
    exclude: ['@midnightntwrk/onchain-runtime-v4'],
    esbuildOptions: { target: 'es2022' },
  },
  server: { port: 5181, fs: { allow: ['..'] } },
}));
