/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import path from 'path';

import setupServer from 'evolution-backend/lib/apps/participant';
import { registerTranslationDir, addTranslationNamespace } from 'chaire-lib-backend/lib/config/i18next';
import {
    registerServerUpdateCallbacksModule,
    registerServerValidationsModule
} from 'evolution-backend/lib/config/serverConfigRegistry';

registerServerUpdateCallbacksModule(require.resolve('./survey/server/serverFieldUpdate'));
registerServerValidationsModule(require.resolve('./survey/server/serverValidations'));

setupServer().catch((error) => {
    console.error('Error starting the server: ', error);
    // eslint-disable-next-line n/no-process-exit
    process.exit(1);
});

// FIXME Project directory is for runtime, locales should be in the config file (See #420)
registerTranslationDir(path.join(__dirname, '../locales/'));
addTranslationNamespace('customServer');
