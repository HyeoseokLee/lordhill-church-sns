import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  globalIgnores(['dist', 'build', 'node_modules', '**/*.d.ts']),
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      // 미사용 변수 (대문자/_ 시작은 무시)
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { varsIgnorePattern: '^[A-Z_]' },
      ],
      // 점진적 마이그레이션 — any 허용
      '@typescript-eslint/no-explicit-any': 'off',
      // 빈 함수 허용
      '@typescript-eslint/no-empty-function': 'off',
      // 리턴 타입 명시 불필요
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      // before-define 비활성화 (TypeScript hoisting)
      'no-use-before-define': 'off',
      '@typescript-eslint/no-use-before-define': 'off',
      // TypeScript가 타입 체크하므로 no-undef 불필요
      'no-undef': 'off',
    },
  },
]);
