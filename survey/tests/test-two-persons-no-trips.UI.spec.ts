import { test } from '@playwright/test';
import * as testHelpers from 'evolution-frontend/tests/ui-testing/testHelpers';
import * as surveyTestHelpers from 'evolution-frontend/tests/ui-testing/surveyTestHelpers';
import { SurveyObjectDetector } from 'evolution-frontend/tests/ui-testing/SurveyObjectDetectors';

const context = {
    page: null as any,
    objectDetector: new SurveyObjectDetector(),
    title: '',
    widgetTestCounters: {}
};

// Configure the tests to run in serial mode (one after the other)
test.describe.configure({ mode: 'serial' });

// Initialize the test page and add it to the context
test.beforeAll(async ({ browser }) => {
    context.page = await testHelpers.initializeTestPage(browser, context.objectDetector);
});

/********** Start the survey **********/

// Start the survey with email
surveyTestHelpers.startAndLoginWithAccessAndPostalCodes({
    context,
    title: 'Enquête Nationale Origine-Destination 2025',
    accessCode: '1234-1111',
    postalCode: 'G1R 5H1',
    expectedToExist: true,
    nextPageUrl: 'survey/home'
});

// FIXME Implement the rest of the test