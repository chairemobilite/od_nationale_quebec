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
// // Start the survey using an access code and postal code combination that does not exist in the database.
// // The survey should still start a new interview with these credentials.
// const postalCode = 'G1R 5H1';
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
commonUITestsHelpers.fillHomeSectionTests({ context, householdSize: 1 });

/********** Tests household section **********/
commonUITestsHelpers.fillHouseholdSectionTests({ context, householdSize: 1 });

/********** Tests tripsIntro section **********/
commonUITestsHelpers.fillTripsintroSectionTests({ context, householdSize: 1 });

/********** Tests end section **********/
commonUITestsHelpers.fillEndSectionTests({ context, householdSize: 1 });

/********** Tests completed section **********/
commonUITestsHelpers.fillCompletedSectionTests({ context, householdSize: 1 });

// TODO: Put the following tests back when the survey is fully functional
// Logout and log back in with same credentials, shoud log in directly
// testHelpers.logoutTest({ context });
// testHelpers.hasConsentTest({ context });
// testHelpers.startSurveyTest({ context });
// testHelpers.registerWithAccessPostalCodeTest({
//     context,
//     postalCode,
//     accessCode,
//     expectedToExist: true,
//     nextPageUrl: 'survey/completed'
// });

// FIXME Validate the survey re-entry
