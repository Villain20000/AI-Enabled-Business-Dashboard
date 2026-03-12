/**
 * ESLint Configuration File
 * 
 * ESLint is a static code analysis tool for identifying problematic patterns
 * in JavaScript/TypeScript code. This configuration extends Next.js's defaults.
 * 
 * @see https://eslint.org/
 * @see https://nextjs.org/docs/app/building-your-application/configuring/eslint
 */

import { defineConfig } from "eslint/config";
import next from "eslint-config-next";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Get current file path for proper directory resolution
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * ESLint configuration
 * Extends Next.js recommended ESLint configuration
 */
export default defineConfig([{
    // Extend all rules from Next.js ESLint config
    extends: [...next],
}]);
