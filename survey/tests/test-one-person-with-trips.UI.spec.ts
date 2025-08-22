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

// Define the visited places for this test scenario
const visitedPlaces: commonUITestsHelpers.VisitedPlace[] = [
    {
        activityCategory: 'shoppingServiceRestaurant',
        activity: 'shopping',
        onTheRoadDepartureType: null, // Question won't show.
        onTheRoadArrivalType: null, // Question won't show.
        alreadyVisitedBySelfOrAnotherHouseholdMember: 'no',
        shortcut: null, // Question won't show.
        name: 'Sports Expert place Ste-Foy',
        _previousPreviousDepartureTime: null, // Question won't show.
        _previousArrivalTime: null, // Question won't show.
        _previousDepartureTime: 32400, // 9:00 AM
        arrivalTime: 34200, // 9:30 AM
        nextPlaceCategory: 'wentBackHome',
        departureTime: 39600 // 11:00 AM
    },
    {
        activityCategory: null, // Question won't show.
        activity: null, // Question won't show.
        onTheRoadDepartureType: null, // Question won't show.
        onTheRoadArrivalType: null, // Question won't show.
        alreadyVisitedBySelfOrAnotherHouseholdMember: null, // Question won't show.
        shortcut: null, // Question won't show.
        name: null, // Question won't show.
        _previousPreviousDepartureTime: null, // Question won't show.
        _previousArrivalTime: null, // Question won't show.
        _previousDepartureTime: null, // Question won't show.
        arrivalTime: 41400, // 11:30 AM
        nextPlaceCategory: 'stayedThereUntilTheNextDay',
        departureTime: null // Question won't show.
    }
];

// Define the segments for this test scenario
const segments: commonUITestsHelpers.Segment[] = [
    {
        segmentIndex: 0,
        sameModeAsReverseTrip: null, // Question won't show.
        modePre: 'taxi',
        mode: null, // Question won't show.
        howToBus: null, // Question won't show.
        paidForParking: null, // Question won't show.
        vehicleOccupancy: null, // Question won't show.
        driver: null, // Question won't show.
        busLines: null, // Question won't show.
        busLinesWarning: null, // Question won't show.
        onDemandType: null, // Question won't show.
        tripJunctionQueryString: null, // Question won't show.
        hasNextMode: false
    },
    {
        segmentIndex: 0,
        sameModeAsReverseTrip: null, // Question won't show.
        modePre: 'bicycle',
        mode: 'bicycle',
        howToBus: null, // Question won't show.
        paidForParking: null, // Question won't show.
        vehicleOccupancy: null, // Question won't show.
        driver: null, // Question won't show.
        busLines: null, // Question won't show.
        busLinesWarning: null, // Question won't show.
        onDemandType: null, // Question won't show.
        tripJunctionQueryString: null, // Question won't show.
        hasNextMode: false
    }
];

/********** Start the survey **********/
// Start the survey using an access code and postal code combination that does not exist in the database.
// The survey should still start a new interview with these credentials.
const postalCode = 'G1R 5H1';
const accessCode = '7357-1112';
surveyTestHelpers.startAndLoginWithAccessAndPostalCodes({
    context,
    title: 'Enquête Nationale Origine-Destination 2025',
    accessCode,
    postalCode,
    expectedToExist: true,
    nextPageUrl: 'survey/home'
});

/********** Tests home section **********/
commonUITestsHelpers.fillHomeSectionTests({ context, householdSize: 1 });

/********** Tests household section **********/
commonUITestsHelpers.fillHouseholdSectionTests({ context, householdSize: 1 });

/********** Tests tripsIntro section **********/
commonUITestsHelpers.fillTripsintroSectionTests({
    context,
    householdSize: 1,
    hasTrips: true,
    expectPopup: false,
    expectedNextSection: 'visitedPlaces'
});

/********** Tests visited places section **********/
commonUITestsHelpers.fillVisitedPlacesSectionTests({ context, householdSize: 1, visitedPlaces });

/********** Tests segments section **********/
commonUITestsHelpers.fillSegmentsSectionTests({
    context,
    householdSize: 1,
    segments,
    expectedNextSection: 'travelBehavior'
});

/********** Tests travelBehavior section **********/
const travelBehavior = _cloneDeep(commonUITestsHelpers.defaultTravelBehavior);
travelBehavior.noWorkTripReason = 'noWork';
travelBehavior.noSchoolTripReason = 'distanceLearning';
commonUITestsHelpers.fillTravelBehaviorSectionTests({
    context,
    householdSize: 1,
    nextSection: 'longDistance',
    travelBehavior
});

/********** Tests longDistance section **********/
// With long distance trips
const longDistance: commonUITestsHelpers.LongDistanceSection = {
    madeLongDistanceTrips: 'yes',
    frequencySeptemberDecember: '00_00',
    frequencyJanuaryApril: '01_03',
    frequencyMayAugust: '04_12',
    wantToParticipateInSurvey: 'yes',
    wantToParticipateInSurveyEmail: 'test@test.org'
};
commonUITestsHelpers.fillLongDistanceSectionTests({ context, householdSize: 1, longDistanceSection: longDistance });

/********** Tests end section **********/
commonUITestsHelpers.fillEndSectionTests({ context, householdSize: 1 });

/********** Tests completed section **********/
commonUITestsHelpers.fillCompletedSectionTests({ context, householdSize: 1 });
