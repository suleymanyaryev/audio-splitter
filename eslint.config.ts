import { globalIgnores } from 'eslint/config'
import js from '@eslint/js'
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import pluginVue from 'eslint-plugin-vue'
import pluginPlaywright from 'eslint-plugin-playwright'
import pluginVitest from '@vitest/eslint-plugin'
import pluginPrettierRecommended from 'eslint-plugin-prettier/recommended'
import sonarjs, { configs as sonarjsConfigs } from 'eslint-plugin-sonarjs'
import unicorn from 'eslint-plugin-unicorn'
import boundaries from 'eslint-plugin-boundaries'

import { IGNORED_DIRECTORIES, SOURCE_EXTENSIONS, SPEC_FILE_GLOB } from './scripts/check-scope.ts'

const SOURCE_FILES = [`**/*.{${SOURCE_EXTENSIONS.join(',')}}`]

// Feature-Sliced Design layers, highest first (docs/adr/0001-fsd-subset.md). A layer imports only
// the layers after it; `app` and `shared` have no slices, the others have one folder per slice.
const LAYERS = ['app', 'pages', 'widgets', 'entities', 'shared'] as const
const SLICED_LAYERS = new Set<string>(['pages', 'widgets', 'entities'])

const config = defineConfigWithVueTs(
  {
    name: 'app/files-to-lint',
    files: SOURCE_FILES,
  },

  globalIgnores(IGNORED_DIRECTORIES.map((directory) => `**/${directory}/**`)),

  js.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  vueTsConfigs.recommended,

  {
    name: 'app/base-rules',
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'dot-notation': 'error',
    },
  },

  {
    name: 'app/sonarjs',
    files: SOURCE_FILES,
    plugins: { sonarjs },
    rules: sonarjsConfigs.recommended.rules,
  },

  {
    name: 'app/unicorn',
    files: SOURCE_FILES,
    plugins: { unicorn },
    rules: unicorn.configs.recommended.rules,
  },

  {
    name: 'app/unicorn/tuning',
    files: SOURCE_FILES,
    rules: {
      // `null` is a legitimate value in browser APIs and initial-state patterns;
      // converting every site to `undefined` would change `??` and serialization semantics.
      'unicorn/no-null': 'off',
      // PascalCase `.vue` component files are the Vue convention (App.vue, WaveformView.vue);
      // the rule cannot be satisfied without breaking it.
      'unicorn/filename-case': 'off',
      // Vue convention identifiers are not genuine abbreviations. The rule matches camelCase words
      // case-sensitively (`canvasEl` -> `canvas` + `El`), so each word needs both forms allowlisted.
      'unicorn/name-replacements': [
        'error',
        {
          allowList: {
            props: true, // Vue props
            Props: true,
            ref: true, // template refs (canvasRef)
            Ref: true,
            el: true, // element refs (canvasEl)
            El: true,
            src: true, // media sources (audioSrc)
            Src: true,
          },
        },
      ],
    },
  },

  {
    name: 'app/boundaries',
    files: [`src/**/*.{${SOURCE_EXTENSIONS.join(',')}}`],
    plugins: { boundaries },
    settings: {
      // Resolves the `@/` alias and `.vue` files, so cross-slice imports are seen at all.
      'import/resolver': { typescript: { project: './tsconfig.app.json' } },
      'boundaries/elements': LAYERS.map((layer) =>
        SLICED_LAYERS.has(layer)
          ? { type: layer, pattern: `src/${layer}/*`, capture: ['slice'], partialMatch: false }
          : { type: layer, pattern: `src/${layer}`, partialMatch: false },
      ),
    },
    rules: {
      // Imports inside one element (a slice, or all of `app` or `shared`) are not checked, so the
      // only allowed imports between elements point down the layer list. Two slices of one layer
      // are two elements with no policy between them, which keeps slices isolated.
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          policies: LAYERS.map((layer, index) => ({
            from: { element: { type: layer } },
            allow: { to: { element: { types: LAYERS.slice(index + 1) } } },
          })),
        },
      ],
    },
  },

  {
    ...pluginVitest.configs.recommended,
    files: [SPEC_FILE_GLOB],
  },

  {
    // Specs log freely when debugging a failing characterization.
    name: 'app/tests',
    files: [SPEC_FILE_GLOB],
    rules: {
      'no-console': 'off',
    },
  },

  {
    ...pluginPlaywright.configs['flat/recommended'],
    files: ['e2e/**/*.{test,spec}.{js,ts,jsx,tsx}'],
  },

  pluginPrettierRecommended,
)

export default config
