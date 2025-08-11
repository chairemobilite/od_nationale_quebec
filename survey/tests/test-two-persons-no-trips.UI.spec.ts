import { test } from '@playwright/test';
import * as testHelpers from 'evolution-frontend/tests/ui-testing/testHelpers';
import * as surveyTestHelpers from 'evolution-frontend/tests/ui-testing/surveyTestHelpers';
import { SurveyObjectDetector } from 'evolution-frontend/tests/ui-testing/SurveyObjectDetectors';
import * as commonUITestsHelpers from './common-UI-tests-helpers';

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
// Start the survey using an access code and postal code combination that does not exist in the database.
// The survey should still start a new interview with these credentials.
const postalCode = 'G5A 1E7';
const accessCode = '7357-1114';
surveyTestHelpers.startAndLoginWithAccessAndPostalCodes({
    context,
    title: 'Enquête Nationale Origine-Destination 2025',
    accessCode,
    postalCode,
    expectedToExist: true,
    nextPageUrl: 'survey/home'
});

/********** Tests home section **********/
commonUITestsHelpers.fillHomeSectionTests({ context, householdSize: 2 });

/********** Tests household section **********/
commonUITestsHelpers.fillHouseholdSectionTests({ context, householdSize: 2 });

/********** Tests selectPerson section **********/
// TODO: Understand why this section is skipped for household size 2
// commonUITestsHelpers.fillSelectPersonSectionTests({ context, householdSize: 2 });

/********** Tests tripsIntro section **********/
commonUITestsHelpers.fillTripsintroSectionTests({ context, householdSize: 2 });

/********** Tests end section **********/
commonUITestsHelpers.fillEndSectionTests({ context, householdSize: 2 });

/********** Tests completed section **********/
commonUITestsHelpers.fillCompletedSectionTests({ context, householdSize: 2 });
