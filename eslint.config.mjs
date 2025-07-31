import js from "@eslint/js";
import globals from "globals";

export default [
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        // Enable common Node.js globals
        require: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        module: 'readonly',
        exports: 'readonly',
        console: 'readonly',
      },
    },
    rules: {
      // Optional rules
    },
  },
];