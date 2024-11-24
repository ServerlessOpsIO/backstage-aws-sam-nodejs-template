import js from "@eslint/js";
import tsEslint from 'typescript-eslint';

module.exports = tsEslint.config(
  js.configs.recommended,
  ...tsEslint.configs.recommended,
)