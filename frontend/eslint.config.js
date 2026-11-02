import { readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import importPlugin from 'eslint-plugin-import'
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

const sourceRoot = fileURLToPath(new URL('./src', import.meta.url))
const features = readdirSync(new URL('./src/features', import.meta.url), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
const sharedFolders = ['components', 'hooks', 'lib', 'config', 'utils']
const zones = [
  ...sharedFolders.flatMap((folder) => [
    { target: `./${folder}`, from: './features' },
    { target: `./${folder}`, from: './app' },
  ]),
  ...features.flatMap((feature) => [
    { target: `./features/${feature}`, from: './app' },
    ...features.filter((other) => other !== feature).map((other) => ({
      target: `./features/${feature}`, from: `./features/${other}`,
    })),
  ]),
]

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    plugins: { import: importPlugin },
    settings: {
      'import/resolver': { typescript: { project: './tsconfig.app.json' } },
    },
    rules: {
      'import/no-restricted-paths': ['error', { basePath: sourceRoot, zones }],
      'no-restricted-imports': ['error', {
        patterns: [{ group: ['./*', '../*'], message: 'Use the @/ alias for source imports.' }],
      }],
    },
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/**/*.test.{ts,tsx}', 'src/testing/**'],
    rules: {
      'import/no-restricted-paths': ['error', {
        basePath: sourceRoot,
        zones: [...zones, { target: './', from: './testing' }],
      }],
    },
  },
])
