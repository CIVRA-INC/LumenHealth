import base from "../../eslint.config.base.mjs";

export default [
  ...base,
  // The architecture and boundary checks are CommonJS scripts.
  { files: ["**/*.cjs"], languageOptions: { sourceType: "commonjs" }, rules: { "@typescript-eslint/no-require-imports": "off" } },
];
