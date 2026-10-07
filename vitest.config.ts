import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    pool: 'forks',
    hookTimeout: 20_000,
    testTimeout: 45_000,
  },
});
