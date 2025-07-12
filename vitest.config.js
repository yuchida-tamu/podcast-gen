import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.{js,ts}'],
    exclude: ['node_modules/**', 'output/**', 'dist/**'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'tests/**',
        'output/**',
        'dist/**',
        'vitest.config.js',
        'tsconfig.json'
      ]
    }
  },
  esbuild: {
    target: 'es2022'
  }
});