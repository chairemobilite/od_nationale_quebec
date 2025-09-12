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
import { setProjectConfig } from 'evolution-backend/lib/config/projectConfig';
import serverUpdateCallbacks from '../survey/server/serverFieldUpdate';
import serverValidations from '../survey/server/serverValidations';
import roleDefinitions from './server/roleDefinitions';
import { setupMonitoringView } from './monitoring';
import adminRoutes from './routes/admin.routes';

// TODO Add validation list filter if necessary
const configureServer = () => {
    setProjectConfig({
        serverUpdateCallbacks,
        serverValidations,
        roleDefinitions
    });

    adminRoutes(router); // Load API admin routes

    setupMonitoringView(); // Add a monitoring view
};

setupServer(configureServer);

// FIXME Project directory is for runtime, locales should be in the config file (See #420)
registerTranslationDir(path.join(__dirname, '../../locales/'));
addTranslationNamespace('customServer');
