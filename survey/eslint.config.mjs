/*
 * Copyright 2026, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { defineConfig, globalIgnores } from 'eslint/config';
import baseConfig from '../evolution/configs/base.eslint.config.mjs';

export default defineConfig([
    globalIgnores([
        '**/lib/',
        '**/references/',
        '**/runtime/',
        '**/assets/images/',
        '**/assets/documents/',
        '**/locales/',
        '**/__tests__/',
        '**/jest.config.js',
        '**/playwright-example.config.ts',
        '**/playwright.config.ts',
        '**/webpack.config.js',
        '**/webpack.admin.config.js',
        '**/config.js',
        '**/configForCi.js',
        '**/configVariantSpecific.js'
    ]),
    baseConfig,
    {
        rules: {
            '@typescript-eslint/no-unused-vars': [
                'warn',
                { vars: 'all', args: 'after-used', argsIgnorePattern: '^_', ignoreRestSiblings: false }
            ]
        },
    },
    {
        // Tasks need to use process.exit(): throwing, as the rule suggests, keeps the process running
        files: ['src/tasks/**/*.task.ts'],
        rules: {
            'n/no-process-exit': 'off'
        }
    }
]);
