/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import path from 'path';

import router from 'chaire-lib-backend/lib/api/admin.routes';
import { registerTranslationDir, addTranslationNamespace } from 'chaire-lib-backend/lib/config/i18next';
import setupServer from 'evolution-backend/lib/apps/admin';
import { setupMonitoringView } from './monitoring';
import adminRoutes from './routes/admin.routes';
import {
    registerRoleDefinitionsModule,
    registerServerUpdateCallbacksModule,
    registerServerValidationsModule,
    registerSurveyObjectParsersModule
} from 'evolution-backend/lib/config/serverConfigRegistry';

// TODO Add validation list filter if necessary
const configureServer = () => {
    adminRoutes(router); // Load API admin routes

    setupMonitoringView(); // Add a monitoring view
};

registerServerUpdateCallbacksModule(require.resolve('../survey/server/serverFieldUpdate'));
registerServerValidationsModule(require.resolve('../survey/server/serverValidations'));
registerRoleDefinitionsModule(require.resolve('./server/roleDefinitions'));
registerSurveyObjectParsersModule(require.resolve('./parsers'));

setupServer(configureServer).catch((error) => {
    console.error('Error starting the server: ', error);
    // eslint-disable-next-line n/no-process-exit
    process.exit(1);
});

// FIXME Project directory is for runtime, locales should be in the config file (See #420)
registerTranslationDir(path.join(__dirname, '../../locales/'));
addTranslationNamespace('customServer');
