// @ts-check

import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import simpleImportSort from "eslint-plugin-simple-import-sort";

const mode = process.env.NODE_ENV === "production" ? "error" : "warn";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      "simple-import-sort": simpleImportSort,
    },
    rules: {
      "simple-import-sort/imports": mode,
      "simple-import-sort/exports": mode,
      "no-console": mode,
      "no-debugger": mode,
    },
  },
);
