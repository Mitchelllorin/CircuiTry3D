import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      // By default (all: false) only files actually imported during tests are
      // measured, which is exactly the business-logic layer that has tests.
      // Thresholds lock in the quality of that layer.
      // Baseline measured 2026-04-10:
      //   statements 78.53 | branches 62.21 | functions 80.34 | lines 80.83
      thresholds: {
        statements: 78,
        branches: 62,
        functions: 80,
        lines: 80,
      },
    },
  },
});
