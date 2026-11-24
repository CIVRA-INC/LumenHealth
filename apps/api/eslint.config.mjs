import base from '@lumen/config/eslint';

export default [
  ...base,
  {
    rules: {
      // Nest's dependency injection reads constructor parameter types at runtime,
      // so injected classes must be value imports.
      '@typescript-eslint/consistent-type-imports': 'off',
      // The CLI scripts (seed, OpenAPI export) report to the terminal.
      'no-console': 'off',
    },
  },
];
