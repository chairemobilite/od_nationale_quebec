// eslint-disable-next-line n/no-extraneous-import
import { test } from '@playwright/test';
import _cloneDeep from 'lodash/cloneDeep';
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

// Survey credentials
const postalCode = 'G5A 1E7';
const accessCode = '7357-1114';

// Configure the tests to run in serial mode (one after the other)
test.describe.configure({ mode: 'serial' });

// Initialize the test page and add it to the context
test.beforeAll(async ({ browser }) => {
    context.page = await testHelpers.initializeTestPage(browser, context.objectDetector);
});

test.afterAll(async () => {
    // Delete the participant after the test
    await commonUITestsHelpers.deleteParticipantInterview(accessCode);
});

/********** Start the survey **********/
// Start the survey using an access code and postal code combination
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
// Skipped in normal workflow

/********** Tests tripsIntro section for first person **********/
commonUITestsHelpers.fillTripsintroSectionTests({
    context,
    householdSize: 2,
    hasTrips: false,
    expectPopup: true,
    expectedNextSection: 'travelBehavior'
});

/********** Tests travelBehavior section for first person **********/
// Clone the default values to avoid modifying the default object, but keep defaults for other fields
const travelBehaviorP1 = _cloneDeep(commonUITestsHelpers.defaultTravelBehavior);
travelBehaviorP1.noWorkTripReason = 'noWork';
travelBehaviorP1.noSchoolTripReason = 'distanceLearning';
commonUITestsHelpers.fillTravelBehaviorSectionTests({
    context,
    householdSize: 1,
    nextSection: 'tripsIntro',
    travelBehavior: travelBehaviorP1
});

/********** Tests tripsIntro section for second person **********/
commonUITestsHelpers.fillTripsintroSectionTests({
    context,
    householdSize: 2,
    hasTrips: false,
    expectPopup: true,
    expectedNextSection: 'travelBehavior'
});

/********** Tests travelBehavior section for second person **********/
// Define travel behavior data
const travelBehaviorP2 = {
    noWorkTripReason: 'other',
    noWorkTripReasonSpecify: 'too much traffic, went back home',
    noSchoolTripReason: 'other',
    noSchoolTripReasonSpecify: 'none of your business'
};
commonUITestsHelpers.fillTravelBehaviorSectionTests({
    context,
    householdSize: 1,
    nextSection: 'end',
    travelBehavior: travelBehaviorP2
});

/********** Tests end section **********/
commonUITestsHelpers.fillEndSectionTests({ context, householdSize: 2 });

/********** Tests completed section **********/
commonUITestsHelpers.fillCompletedSectionTests({ context, householdSize: 2 });
