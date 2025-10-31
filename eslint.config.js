import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      "@typescript-eslint/no-unused-vars": "off", // Will fix in Milestone 4
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/explicit-function-return-type": "off", // Too strict for now
      "@typescript-eslint/no-non-null-assertion": "warn",
      "@typescript-eslint/no-unsafe-assignment": "off", // Will fix in Milestone 4
      "@typescript-eslint/no-unsafe-member-access": "off", // Will fix in Milestone 4
      "@typescript-eslint/no-unsafe-call": "off", // Will fix in Milestone 4
      "@typescript-eslint/no-unsafe-return": "off", // Will fix in Milestone 4
      "@typescript-eslint/no-unsafe-argument": "off", // Will fix in Milestone 4
      "@typescript-eslint/no-floating-promises": "off", // Will fix in Milestone 4
      "@typescript-eslint/require-await": "off", // Will fix in Milestone 4
      "@typescript-eslint/ban-ts-comment": "warn", // Will fix in Milestone 4
      "@typescript-eslint/no-misused-promises": "off", // Will fix in Milestone 4
      "@typescript-eslint/no-unnecessary-type-assertion": "off", // Will fix in Milestone 4
      "@typescript-eslint/await-thenable": "off", // Will fix in Milestone 4
    },
  },
  {
    ignores: ["main.js", "*.config.js", "*.config.mjs", "version-bump.mjs", "node_modules/", "dist/"],
  },
);
