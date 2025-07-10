import globals from "globals";
import pluginJs from "@eslint/js";
import jsdoc from "eslint-plugin-jsdoc";

export default [
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  pluginJs.configs.recommended,
  jsdoc.configs["flat/recommended"],
  {
    files: ["**/*.js"],
    plugins: {
      jsdoc,
    },
    rules: {
      "jsdoc/check-types": "error",
      "jsdoc/require-jsdoc": "off",
      "jsdoc/require-returns": "off",
    },
  },
];
