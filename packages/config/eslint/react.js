import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import base from './index.js';

/** Flat config for browser/React packages. */
export default [
  ...base,
  reactHooks.configs.flat.recommended,
  {
    languageOptions: { globals: { ...globals.browser } },
  },
];
