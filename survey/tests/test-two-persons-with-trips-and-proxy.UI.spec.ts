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
const postalCode = 'G0L 1G0';
const accessCode = '7357-1117';

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

/********** Test data **********/
// 2 identical persons, so selected order does not matter: full time worker,
// with driving license, no transit pass, on location work. Second person is
// proxy declared
const person1: commonUITestsHelpers.HouseholdMember = {
    personIndex: 0,
    nickname: 'Martha',
    age: 30,
    sexAssignedAtBirth: 'female',
    gender: null,
    genderCustom: null,
    workerType: 'fullTime',
    studentType: 'no',
    schoolType: null, // Question won't show.
    occupation: null, // Question won't show.
    workerTypeBeforeLeave: null, // Question won't show.
    educationalAttainment: 'postSecondaryNonTertiaryEducation',
    drivingLicenseOwnership: 'yes',
    carSharingMember: 'yes',
    transitPasses: ['no'],
    hasDisability: 'no',
    workPlaceType: 'onLocation',
    workPlaceTypeBeforeLeave: null,
    schoolPlaceType: null,
    usualWorkPlace: {
        name: 'Motel Au Fleuve d\'Argent'
    },
    usualSchoolPlace: null,
    travelToWorkDays: ['no'],
    remoteWorkDays: null
};
const person2: commonUITestsHelpers.HouseholdMember = {
    personIndex: 1,
    nickname: 'Angela',
    age: 30,
    sexAssignedAtBirth: 'female',
    gender: null,
    genderCustom: null,
    workerType: 'fullTime',
    studentType: 'no',
    schoolType: null, // Question won't show.
    occupation: null, // Question won't show.
    workerTypeBeforeLeave: null, // Question won't show.
    educationalAttainment: 'postSecondaryNonTertiaryEducation',
    drivingLicenseOwnership: 'yes',
    carSharingMember: 'yes',
    transitPasses: ['no'],
    hasDisability: 'no',
    workPlaceType: 'onLocation',
    workPlaceTypeBeforeLeave: null,
    schoolPlaceType: null,
    usualWorkPlace: {
        name: 'Hôpital régional du grand portage'
    },
    usualSchoolPlace: null,
    travelToWorkDays: ['no'],
    remoteWorkDays: null // Question won't show
};

// P1 goes to work, then stops at the MdDonald to pick up P2 and go home
const visitedPlacesP1: commonUITestsHelpers.VisitedPlace[] = [
    {
        activityCategory: 'work',
        activity: 'workUsual',
        onTheRoadDepartureType: null, // Question won't show.
        onTheRoadArrivalType: null, // Question won't show.
        alreadyVisitedBySelfOrAnotherHouseholdMember: null, // Question won't show
        shortcut: null, // Question won't show.
        name: null, // Question won't show.
        _previousPreviousDepartureTime: null, // Question won't show.
        _previousArrivalTime: null, // Question won't show.
        _previousDepartureTime: 32400, // 9:00 AM
        arrivalTime: 34200, // 9:30 AM
        nextPlaceCategory: 'visitedAnotherPlace',
        departureTime: 16 * 60 * 60 // 16:00
    },
    {
        activityCategory: 'shoppingServiceRestaurant',
        activity: 'restaurant',
        onTheRoadDepartureType: null, // Question won't show.
        onTheRoadArrivalType: null, // Question won't show.
        alreadyVisitedBySelfOrAnotherHouseholdMember: false,
        shortcut: null, // Question won't show.
        name: 'McDonald Rivière du Loup',
        _previousPreviousDepartureTime: null, // Question won't show.
        _previousArrivalTime: null, // Question won't show.
        _previousDepartureTime: null, // Question won't show.
        arrivalTime: 16 * 60 * 60 + 30 * 60, // 16:30
        nextPlaceCategory: 'wentBackHome',
        departureTime: 17 * 60 * 60 // 17:00
    },
    {
        activityCategory: undefined,
        activity: null,
        onTheRoadDepartureType: null, // Question won't show.
        onTheRoadArrivalType: null, // Question won't show.
        alreadyVisitedBySelfOrAnotherHouseholdMember: null,
        shortcut: null, // Question won't show.
        name: null,
        _previousPreviousDepartureTime: null, // Question won't show.
        _previousArrivalTime: null, // Question won't show.
        _previousDepartureTime: null, // Question won't show.
        arrivalTime: 17 * 60 * 60 + 30 * 60, // 17:30
        nextPlaceCategory: 'stayedThereUntilTheNextDay',
        departureTime: null
    }
];

// Define the segments for this test scenario, carDriver all along
const segmentsP1: commonUITestsHelpers.Segment[] = [
    {
        segmentIndex: 0,
        sameModeAsReverseTrip: null, // Question won't show.
        modePre: 'carDriver',
        mode: 'carDriver',
        howToBus: null, // Question won't show.
        paidForParking: 'no',
        vehicleOccupancy: 1,
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
        modePre: 'carDriver',
        mode: 'carDriver',
        howToBus: null, // Question won't show.
        paidForParking: null, // Question won't show.
        vehicleOccupancy: 1,
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
        modePre: 'carDriver',
        mode: 'carDriver',
        howToBus: null, // Question won't show.
        paidForParking: null, // Question won't show.
        vehicleOccupancy: 2,
        driver: null, // Question won't show.
        busLines: null, // Question won't show.
        busLinesWarning: null, // Question won't show.
        onDemandType: null, // Question won't show.
        tripJunctionQueryString: null, // Question won't show.
        hasNextMode: false
    }
];

// P2 goes to work, then to the McDonald and goes home with P1
const visitedPlacesP2: commonUITestsHelpers.VisitedPlace[] = [
    {
        activityCategory: 'work',
        activity: 'workUsual',
        onTheRoadDepartureType: null, // Question won't show.
        onTheRoadArrivalType: null, // Question won't show.
        alreadyVisitedBySelfOrAnotherHouseholdMember: null, // Question won't show
        shortcut: null, // Question won't show.
        name: null, // Question won't show.
        _previousPreviousDepartureTime: null, // Question won't show.
        _previousArrivalTime: null, // Question won't show.
        _previousDepartureTime: 7 * 60 * 60, // 7:00 AM
        arrivalTime: 7 * 60 * 60 + 30 * 60, // 7:30 AM
        nextPlaceCategory: 'visitedAnotherPlace',
        departureTime: 15 * 60 * 60 + 40 * 60 // 15h40
    },
    // Using shortcut to get the place from the first person's visited place
    {
        activityCategory: 'shoppingServiceRestaurant',
        activity: 'restaurant',
        onTheRoadDepartureType: null, // Question won't show.
        onTheRoadArrivalType: null, // Question won't show.
        alreadyVisitedBySelfOrAnotherHouseholdMember: false,
        shortcut: null,
        name: 'McDonald Rivière du Loup',
        _previousPreviousDepartureTime: null, // Question won't show.
        _previousArrivalTime: null, // Question won't show.
        _previousDepartureTime: null, // Question won't show.
        arrivalTime: 16 * 60 * 60, // 16:00
        nextPlaceCategory: 'wentBackHome',
        departureTime: 17 * 60 * 60 // 17:00
    },
    {
        activityCategory: undefined, // Present, but no need to set it
        activity: null, // Question won't show.
        onTheRoadDepartureType: null, // Question won't show.
        onTheRoadArrivalType: null, // Question won't show.
        alreadyVisitedBySelfOrAnotherHouseholdMember: null, // Question won't show.
        shortcut: null, // Question won't show.
        name: null, // Question won't show.
        _previousPreviousDepartureTime: null, // Question won't show.
        _previousArrivalTime: null, // Question won't show.
        _previousDepartureTime: null, // Question won't show.
        arrivalTime: 17 * 60 * 60 + 30 * 60, // 17:30
        nextPlaceCategory: 'stayedThereUntilTheNextDay',
        departureTime: null // Question won't show.
    }
];

// Define the segments for this test scenario
// Drove to work, but the vehicle occupancy is unknown since it's a proxy
const segmentsP2: commonUITestsHelpers.Segment[] = [
    {
        segmentIndex: 0,
        sameModeAsReverseTrip: null, // Question won't show.
        modePre: 'carDriver',
        mode: 'carDriver', // Question won't show
        howToBus: null, // Question won't show.
        paidForParking: 'yes',
        vehicleOccupancy: 'dontKnow', // Question won't show.
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
        modePre: 'taxi',
        mode: 'taxi',
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
        modePre: 'carPassenger',
        mode: null, // Question won't show
        howToBus: null, // Question won't show.
        paidForParking: null, // Question won't show.
        vehicleOccupancy: null, // Question won't show.
        driver: '${tripDiary[0].personId}', // Set the driver of the carPassenger mode to be the first person
        busLines: null, // Question won't show.
        busLinesWarning: null, // Question won't show.
        onDemandType: null, // Question won't show.
        tripJunctionQueryString: null, // Question won't show.
        hasNextMode: false
    }
];

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
commonUITestsHelpers.fillHouseholdSectionWithMembersTests({ context, householdMembers: [person1, person2] });

/********** Tests selectPerson section **********/
// Skipped in normal workflow

/********** Tests tripsIntro section for first person **********/
commonUITestsHelpers.fillTripsintroSectionTests({
    context,
    householdSize: 2,
    hasTrips: true,
    expectPopup: true,
    expectedNextSection: 'visitedPlaces'
});

/********** Tests visited places section for person 1 **********/
commonUITestsHelpers.fillVisitedPlacesSectionTests({
    context,
    householdSize: 2,
    visitedPlaces: visitedPlacesP1,
    journeyStartsAtHome: true
});

/********** Tests segments section, then go to next person's trips **********/
commonUITestsHelpers.fillSegmentsSectionTests({
    context,
    householdSize: 2,
    segments: segmentsP1,
    expectedNextSection: 'tripsIntro'
});

/********** Tests tripsIntro section for second person **********/
commonUITestsHelpers.fillTripsintroSectionTests({
    context,
    householdSize: 2,
    hasTrips: true,
    // Proxy respondent, first person responded
    whoAnswersFor: '${tripDiary[0].personId}',
    expectPopup: true,
    expectedNextSection: 'visitedPlaces'
});

/********** Tests visited places section for person 2 **********/
commonUITestsHelpers.fillVisitedPlacesSectionTests({
    context,
    householdSize: 2,
    visitedPlaces: visitedPlacesP2,
    isSelfDeclared: false,
    journeyStartsAtHome: true
});

/********** Tests segments section, then go to long distance section **********/
commonUITestsHelpers.fillSegmentsSectionTests({
    context,
    householdSize: 2,
    segments: segmentsP2,
    expectedNextSection: 'longDistance'
});

/********** Tests longDistance section **********/
// No long distance trips
commonUITestsHelpers.fillLongDistanceSectionTests({ context, householdSize: 2 });

/********** Tests end section **********/
commonUITestsHelpers.fillEndSectionTests({ context, householdSize: 2 });

/********** Tests completed section **********/
commonUITestsHelpers.fillCompletedSectionTests({ context, householdSize: 2 });
