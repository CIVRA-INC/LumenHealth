import nextVitals from "eslint-config-next/core-web-vitals";
import { coreRules } from "../../eslint.config.base.mjs";

const config = [
  ...nextVitals,
  // Same core TypeScript rules as every other workspace.
  { rules: coreRules },
];

export default config;
