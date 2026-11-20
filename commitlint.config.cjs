module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "scope-enum": [
      2,
      "always",
      ["api", "web", "mobile", "stellar", "types", "config", "ci", "docs"],
    ],
  },
};
