import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: [
        'src/auth/auth-service.ts',
        'src/auth/errors.ts',
        'src/auth/google-sign-in.android.ts',
        'src/groups/document-mappers.ts',
        'src/groups/history-policy.ts',
        'src/groups/qr.ts',
        'src/groups/request-id.ts',
        'src/groups/return-to.ts',
        'src/notifications/incoming-transfer-policy.ts',
      ],
      thresholds: { lines: 90, functions: 90, branches: 90, statements: 90 },
    },
  },
});
