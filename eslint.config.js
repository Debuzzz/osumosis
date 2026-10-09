import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["dist/**", ".desktop/**", "node_modules/**", "src-tauri/**", "coverage/**"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{js,mjs,cjs,jsx,ts,tsx}"],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "react-refresh/only-export-components": "warn",
      "no-undef": "off",
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", ignoreRestSiblings: true },
      ],
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
  {
    files: ["**/*.{js,mjs,cjs,jsx}"],
    rules: { "no-undef": "error" },
  },
  {
    files: ["test/**/*.{js,mjs,cjs,jsx,ts,tsx}"],
    rules: { "@typescript-eslint/no-unused-expressions": "off" },
  },
  {
    files: ["src/**/*.{ts,tsx}", "server/**/*.ts"],
    rules: { "max-lines": ["error", { max: 450, skipBlankLines: true, skipComments: true }] },
  },
  prettier,
);
