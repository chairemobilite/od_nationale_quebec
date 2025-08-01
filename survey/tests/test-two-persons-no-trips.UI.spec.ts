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
// Start the survey without email
// // Start the survey using an access code and postal code combination that does not exist in the database.
// // The survey should still start a new interview with these credentials.
// const postalCode = 'G1R 5H2';
// // Generate a random access code in the format 0123-4567
// const accessCode = commonUITestsHelpers.generateRandomAccessCode();
// surveyTestHelpers.startAndLoginWithAccessAndPostalCodes({
//     context,
//     title: 'Enquête Nationale Origine-Destination 2025',
//     accessCode,
//     postalCode,
//     expectedToExist: false,
//     nextPageUrl: 'survey/home'
// });

// TODO: Remove this auth test when the survey is fully functional
// TODO: For now, it is used because the survey is easier to test without access code and postal code
surveyTestHelpers.startAndLoginAnonymously({ context, title: 'Enquête Nationale Origine-Destination 2025', hasUser: false });

/********** Tests home section **********/
commonUITestsHelpers.fillHomeSectionTests({ context, householdSize: 2 });

/********** Tests household section **********/
commonUITestsHelpers.fillHouseholdSectionTests({ context, householdSize: 2 });

/********** Tests selectPerson section **********/
// TODO: Understand why this section is skipped for household size 2
// commonUITestsHelpers.fillSelectPersonSectionTests({ context, householdSize: 2 });

// /********** Tests tripsIntro section **********/
// commonUITestsHelpers.fillTripsintroSectionTests({ context, householdSize: 2 });

// /********** Tests end section **********/
// commonUITestsHelpers.fillEndSectionTests({ context, householdSize: 2 });

// /********** Tests completed section **********/
// commonUITestsHelpers.fillCompletedSectionTests({ context, householdSize: 2 });
