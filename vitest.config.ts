import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/__tests__/**/*.ts'],
    coverage: {
      reporter: ['text', 'html'],
    },
  },
});
