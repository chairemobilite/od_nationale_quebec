/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import runClientApp from 'evolution-frontend/lib/apps/admin';
import { setApplicationConfiguration } from 'chaire-lib-frontend/lib/config/application.config';
import appConfig, { EvolutionApplicationConfiguration } from 'evolution-frontend/lib/config/application.config';
import VisitedPlaceSection from '../survey/sections/visitedPlaces/template';

import surveySections from '../survey/sections';
import { widgets as widgetsConfig } from '../survey/widgetsConfigs';

setApplicationConfiguration<EvolutionApplicationConfiguration>({
    sections: surveySections,
    widgets: widgetsConfig as any,
    allowedUrlFields: ['source', 'accessCode'],
    templateMapping: { ...appConfig.templateMapping, visitedPlaces: VisitedPlaceSection }
});

runClientApp();
