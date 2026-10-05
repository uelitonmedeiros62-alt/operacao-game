/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { swPrecache } from './scripts/sw-plugin';

export default defineConfig({
  base: './',
  plugins: [react(), swPrecache()],
  // iPhone: Safari 15.4+ (necessário para <dialog>, structuredClone e crypto.randomUUID).
  build: { target: ['es2020', 'safari15', 'chrome100', 'firefox100'] },
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
