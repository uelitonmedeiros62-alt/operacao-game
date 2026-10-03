/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { swPrecache } from './scripts/sw-plugin';

export default defineConfig({
  base: './',
  plugins: [react(), swPrecache()],
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
