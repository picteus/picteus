import tsPlugin from "@typescript-eslint/eslint-plugin";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";


export default [
  {
    ignores: [
      "dist/**",
      "build/**",
      "node_modules/**",
      ".eslintrc.cjs",
      "eslint.config.js",
      "src/generated/**",
      "picteus-ws-client/**"
    ]
  },
  ...tsPlugin.configs["flat/recommended"],
  {
    files: [
      "**/*.{ts,tsx}"
    ],
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh
    },
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es2020
      }
    },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "off",
      "@typescript-eslint/no-unused-vars": [ "warn", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
        destructuredArrayIgnorePattern: "^_"
      } ],
      "@typescript-eslint/no-inferrable-types": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-empty-object-type": "off"
    }
  }
];
