/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    // 전체 실행(90파일 · jsdom 병렬) 부하에서 매번 다른 테스트가 기본 대기(5초 · findBy 1초)를 넘겨 실패했어요 → 대기만 늘려요
    testTimeout: 20_000,
    setupFiles: ['tests/setup.ts'],
    // Unit tests use mocks and must not depend on a developer's .env.local services.
    env: {
      VITE_SUPABASE_URL: '',
      VITE_SUPABASE_PUBLISHABLE_KEY: '',
      VITE_AI_PROXY_URL: '',
    },
  },
});
