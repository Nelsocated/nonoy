import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    // Nest TestingModule setup in beforeEach can pass the 10s default when
    // the laptop is busy
    hookTimeout: 30_000,
    // e2e boots the real AppModule, which reads JWT secrets + DATABASE_URL
    setupFiles: ['dotenv/config'],
  },
});
