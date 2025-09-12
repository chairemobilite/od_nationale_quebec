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
import addInterviewerOptions from 'evolution-interviewer/lib/client/services/interviewers/interviewerSupport';

import surveySections from '../survey/sections';
import { widgets as widgetsConfig } from '../survey/widgetsConfigs';
import monitoring from './components/Monitoring';

// TODO This is a workaround to get the links to the user, until some more complete solution is implemented (see https://github.com/chairemobilite/transition/issues/1516)
const pages = appConfig.pages;
pages.push({ path: '/interviews', permissions: { Interviews: ['read', 'update'] }, title: 'customLabel:Interviewers' });

setApplicationConfiguration<EvolutionApplicationConfiguration>(
    addInterviewerOptions({
        sections: surveySections,
        widgets: widgetsConfig as any,
        allowedUrlFields: ['source', 'accessCode'],
        templateMapping: { ...appConfig.templateMapping, visitedPlaces: VisitedPlaceSection },
        // FIXME See why we need the cast, it does not compile otherwise
        getAdminMonitoringComponents: () => monitoring as any[],
        pages
    }) as any
);

runClientApp();
