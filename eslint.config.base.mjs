// Shared ESLint flat config. Each workspace config spreads `base` and adds only
// its app-specific rules (next, react-native, ...). The eslint, @eslint/js and
// typescript-eslint packages live in the root devDependencies at one version.
import js from "@eslint/js";
import tseslint from "typescript-eslint";

/** Core TypeScript rules every workspace shares. */
export const coreRules = {
  "@typescript-eslint/no-unused-vars": [
    "error",
    { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
  ],
  "@typescript-eslint/no-explicit-any": "warn",
  "no-console": ["warn", { allow: ["warn", "error"] }],
};

export const ignores = ["dist/**", ".next/**", "coverage/**", "node_modules/**"];

const base = tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { rules: coreRules },
  { ignores },
);

export default base;
