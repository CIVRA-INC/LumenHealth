export const eniolaagoro7TypeAwareEslintRules = {
  languageOptions: {
    parserOptions: {
      projectService: true,
    },
  },
  rules: {
    "@typescript-eslint/no-floating-promises": ["error", { ignoreVoid: true, ignoreIIFE: true }],
    "@typescript-eslint/consistent-type-imports": ["error", { prefer: "type-imports", fixStyle: "separate-type-imports" }],
  },
};

export function hasRequiredEniolaagoro7TypeAwareRules(config) {
  const rules = config?.rules ?? {};
  return Boolean(rules["@typescript-eslint/no-floating-promises"] && rules["@typescript-eslint/consistent-type-imports"]);
}
