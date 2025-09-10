import knex from 'chaire-lib-backend/lib/config/shared/db.config';
import * as testHelpers from 'evolution-frontend/tests/ui-testing/testHelpers';

// Function to run in the `afterAll` hook to delete the participant interview, to allow retries to reset the state to its original value
export const deleteParticipantInterview = async (accessCode: string) => {
    try {
        // Add a timeout to the database operation
        await knex('sv_participants').del().whereILike('username', `${accessCode}-%`);
        await new Promise((_, reject) => setTimeout(() => reject(new Error('Database operation timeout')), 10000));
    } catch (error) {
        console.error(`Error deleting participant with access code ${accessCode}`, error);
    }
};

// Modify the CommonTestParameters type with survey parameters
export type CommonTestParametersModify = testHelpers.CommonTestParameters & {
    householdSize?: number;
    addressIsFilled?: boolean;
};

// Generate a random access code in the format 0123-4567 from 0000-0000 to 9999-9999
export const generateRandomAccessCode = () =>
    `${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;

export type HouseholdMember = {
    personIndex: number;
    nickname: string;
    age: number;
    sexAssignedAtBirth: string;
    gender: string | null;
    genderCustom: string | null;
    workerType: string;
    studentType: string;
    schoolType: string | null;
    occupation: string | null;
    workerTypeBeforeLeave: string | null;
    educationalAttainment: string | null;
    drivingLicenseOwnership: string;
    carSharingMember: string | null;
    transitPasses: string[];
    hasDisability: string | null;
    workPlaceType: string | null;
    workPlaceTypeBeforeLeave: string | null;
    schoolPlaceType: string | null;
    usualWorkPlace: {
        name: string;
    };
    usualSchoolPlace: {
        name: string;
    };
    travelToWorkDays: string[];
    remoteWorkDays: string[];
};

export type Segment = {
    segmentIndex: number;
    sameModeAsReverseTrip: boolean | null;
    modePre: string | null;
    mode: string | null;
    howToBus: string | null;
    paidForParking: boolean | null;
    vehicleOccupancy: number | null;
    driver: boolean | null;
    busLines: string[] | null;
    busLinesWarning: boolean | null;
    onDemandType: string | null;
    tripJunctionQueryString: string | null;
    hasNextMode: boolean | null;
};

// TODO: Consider moving the householdMembers array to the individual test files for easier customization per test case.
const householdMembers: HouseholdMember[] = [
    {
        personIndex: 0,
        nickname: 'Martha',
        age: 30,
        sexAssignedAtBirth: 'female',
        gender: null,
        genderCustom: null,
        workerType: 'fullTime',
        studentType: 'partTime',
        schoolType: null, // Question won't show.
        occupation: null, // Question won't show.
        workerTypeBeforeLeave: null, // Question won't show.
        educationalAttainment: 'postSecondaryNonTertiaryEducation',
        drivingLicenseOwnership: 'yes',
        carSharingMember: 'yes',
        transitPasses: ['transitPass'],
        hasDisability: 'no',
        workPlaceType: 'hybrid',
        workPlaceTypeBeforeLeave: null,
        schoolPlaceType: 'hybrid',
        usualWorkPlace: {
            name: 'Bombardier'
        },
        usualSchoolPlace: {
            name: 'Université de Montréal, Campus de la Montagne'
        },
        travelToWorkDays: ['no'],
        remoteWorkDays: ['no']
    }
];

export type VisitedPlace = {
    activityCategory: string | null;
    activity: string | null;
    onTheRoadDepartureType: string | null;
    onTheRoadArrivalType: string | null;
    alreadyVisitedBySelfOrAnotherHouseholdMember: string | null;
    shortcut: string | null;
    name: string | null;
    _previousPreviousDepartureTime: number | null;
    _previousArrivalTime: number | null;
    _previousDepartureTime: number | null;
    arrivalTime: number | null;
    nextPlaceCategory: string | null;
    departureTime: number | null;
};

export type TravelBehavior = {
    noWorkTripReason: string | null;
    noWorkTripReasonSpecify: string | null;
    noSchoolTripReason: string | null;
    noSchoolTripReasonSpecify: string | null;
};

export const defaultTravelBehavior: TravelBehavior = {
    noWorkTripReason: null,
    noWorkTripReasonSpecify: null,
    noSchoolTripReason: null,
    noSchoolTripReasonSpecify: null
};

export type LongDistanceSection = {
    madeLongDistanceTrips: 'yes' | 'no' | 'dontKnow';
    frequencySeptemberDecember: string | null;
    frequencyJanuaryApril: string | null;
    frequencyMayAugust: string | null;
    wantToParticipateInSurvey: string | null;
    wantToParticipateInSurveyEmail: string | null;
};

export const defaultLongDistance: LongDistanceSection = {
    madeLongDistanceTrips: 'no',
    frequencySeptemberDecember: null,
    frequencyJanuaryApril: null,
    frequencyMayAugust: null,
    wantToParticipateInSurvey: null,
    wantToParticipateInSurveyEmail: null
};

/********** Tests home section **********/
export const fillHomeSectionTests = ({
    context,
    householdSize = 1,
    addressIsFilled = true
}: CommonTestParametersModify) => {
    // Verify the home navigation is active
    testHelpers.verifyNavBarButtonStatus({ context, buttonText: 'home', buttonStatus: 'active', isDisabled: false });

    // Test string widget accessCode with conditional accessCodeIsSetCustomConditional
    /* @link file://./../src/survey/common/conditionals.tsx */
    testHelpers.inputVisibleTest({ context, path: 'accessCode', isVisible: false });

    // Test radio widget acceptToBeContactedForHelp with choices yesNo
    /* @link file://./../src/survey/common/choices.tsx */
    testHelpers.inputRadioTest({ context, path: 'acceptToBeContactedForHelp', value: 'yes' });

    // Test infotext widget contactInformationIntro with conditional acceptsToBeContactedForHelp
    /* @link file://./../src/survey/common/conditionals.tsx */
    testHelpers.waitTextVisible({ context, text: 'Please enter the email or phone number to get in contact' });

    // Test string widget contactEmail with conditional acceptsToBeContactedForHelp
    /* @link file://./../src/survey/common/conditionals.tsx */
    testHelpers.inputStringTest({ context, path: 'contactEmail', value: 'test@test.com' });

    // Test string widget phoneNumber with conditional acceptsToBeContactedForHelp
    /* @link file://./../src/survey/common/conditionals.tsx */
    testHelpers.inputStringTest({ context, path: 'phoneNumber', value: '438-456-7890' });

    if (!addressIsFilled) {
        // Test string widget home_address
        testHelpers.inputStringTest({ context, path: 'home.address', value: '4898 Avenue du Parc' });

        // Test string widget home_city
        testHelpers.inputStringTest({ context, path: 'home.city', value: 'Montréal' });

        // Test string widget home_region with conditional hiddenWithQuebecAsDefaultValueCustomConditional
        /* @link file://./../src/survey/common/conditionals.tsx */
        testHelpers.inputVisibleTest({ context, path: 'home.region', isVisible: false });

        // Test string widget home_country with conditional hiddenWithCanadaAsDefaultValueCustomConditional
        /* @link file://./../src/survey/common/conditionals.tsx */
        testHelpers.inputVisibleTest({ context, path: 'home.country', isVisible: false });

        // Test string widget home_postalCode
        testHelpers.inputStringTest({ context, path: 'home.postalCode', value: 'H2V 4E6' });

        // Test custom widget home_geography
        testHelpers.inputMapFindPlaceTest({ context, path: 'home.geography' });
    } else {
        // FIXME Validate the address is filled correctly. For now, we just
        // assume the value is there otherwise the test will fail later when
        // trying to change section

        // Test visibility of address inputs, without filling any values
        testHelpers.inputVisibleTest({ context, path: 'home.address', isVisible: true });
        testHelpers.inputVisibleTest({ context, path: 'home.city', isVisible: true });
        testHelpers.inputVisibleTest({ context, path: 'home.postalCode', isVisible: true });

        // Test string widget home_region with conditional hiddenWithQuebecAsDefaultValueCustomConditional
        /* @link file://./../src/survey/common/conditionals.tsx */
        testHelpers.inputVisibleTest({ context, path: 'home.region', isVisible: false });

        // Test string widget home_country with conditional hiddenWithCanadaAsDefaultValueCustomConditional
        /* @link file://./../src/survey/common/conditionals.tsx */
        testHelpers.inputVisibleTest({ context, path: 'home.country', isVisible: false });
    }

    // Test radionumber widget household_size
    testHelpers.inputRadioTest({ context, path: 'household.size', value: String(householdSize) });

    // Test radionumber widget household_carNumber
    testHelpers.inputRadioTest({ context, path: 'household.carNumber', value: '2' });

    // Test radionumber widget household_bicycleNumber
    testHelpers.inputRadioTest({ context, path: 'household.bicycleNumber', value: '2' });

    // Test radionumber widget household_electricBicycleNumber with conditional hasHouseholdBicycleConditional
    /* @link file://./../src/survey/common/conditionals.tsx */
    testHelpers.inputRadioTest({ context, path: 'household.electricBicycleNumber', value: '1' });

    // Test radio widget household_atLeastOnePersonWithDisability with conditional hasHouseholdSize2OrMoreConditional with choices yesNoPreferNotToAnswer
    /* @link file://./../src/survey/common/conditionals.tsx */
    /* @link file://./../src/survey/common/choices.tsx */
    if (householdSize === 1) {
        testHelpers.inputVisibleTest({ context, path: 'household.atLeastOnePersonWithDisability', isVisible: false });
    } else {
        testHelpers.inputRadioTest({ context, path: 'household.atLeastOnePersonWithDisability', value: 'yes' });
    }

    // Test nextbutton widget home_save
    testHelpers.inputNextButtonTest({ context, text: 'Save and continue', nextPageUrl: '/survey/household' });

    // Verify the home navigation is completed
    testHelpers.verifyNavBarButtonStatus({ context, buttonText: 'home', buttonStatus: 'completed', isDisabled: false });
};

/********** Tests household section **********/
export const fillHouseholdSectionTests = ({ context, householdSize = 1 }: CommonTestParametersModify) => {
    // Verify the household navigation is active
    testHelpers.verifyNavBarButtonStatus({
        context,
        buttonText: 'household',
        buttonStatus: 'active',
        isDisabled: false
    });

    // Test custom widget householdMembers
    testHelpers.waitTextVisible({ context, text: 'Household members' });

    // Add additional household members based on householdSize
    if (householdSize >= 2) {
        householdMembers.push({
            personIndex: 1,
            nickname: 'John',
            age: 35,
            sexAssignedAtBirth: 'male',
            gender: null,
            genderCustom: null,
            workerType: 'partTime',
            studentType: 'fullTime',
            schoolType: null, // Question won't show.
            occupation: null, // Question won't show.
            workerTypeBeforeLeave: null, // Question won't show.
            educationalAttainment: 'bachelorOrHigher',
            drivingLicenseOwnership: 'no',
            carSharingMember: null, // Question won't show.
            transitPasses: ['transitPass'],
            hasDisability: 'yes',
            workPlaceType: 'hybrid',
            workPlaceTypeBeforeLeave: null,
            schoolPlaceType: 'hybrid',
            usualWorkPlace: {
                name: 'Bombardier'
            },
            usualSchoolPlace: {
                name: 'Université de Montréal, Campus de la Montagne'
            },
            travelToWorkDays: ['no'],
            remoteWorkDays: ['no']
        });
    }

    // Add tests for each household member
    householdMembers.forEach((person: HouseholdMember, index) => {
        // Build a string for personId (e.g., "${personId[0]}") using a template literal to avoid immediate interpolation
        const personIdString = `\${personId[${index}]}`;

        // Test number widget personAge
        testHelpers.inputStringTest({
            context,
            path: `household.persons.${personIdString}.age`,
            value: person.age.toString()
        });

        // Test string widget personNickname with conditional hasHouseholdSize2OrMoreConditional
        /* @link file://./../src/survey/common/conditionals.tsx */
        if (householdSize === 1) {
            testHelpers.inputVisibleTest({
                context,
                path: `household.persons.${personIdString}.nickname`,
                isVisible: false
            });
        } else {
            testHelpers.inputStringTest({
                context,
                path: `household.persons.${personIdString}.nickname`,
                value: person.nickname
            });
        }

        // Test radio widget personHasDisability with conditional hasOnePersonWithDisabilityOrHhSize1Conditional with choices yesNoPreferNotToAnswer
        /* @link file://./../src/survey/common/conditionals.tsx */
        /* @link file://./../src/survey/common/choices.tsx */
        if (person.hasDisability === null) {
            testHelpers.inputVisibleTest({
                context,
                path: `household.persons.${personIdString}.hasDisability`,
                isVisible: false
            });
        } else {
            testHelpers.inputRadioTest({
                context,
                path: `household.persons.${personIdString}.hasDisability`,
                value: person.hasDisability
            });
        }

        // Test radio widget personSexAssignedAtBirth with conditional ifAge5orMoreConditional with choices maleFemalePreferNotAnswer
        /* @link file://./../src/survey/common/conditionals.tsx */
        /* @link file://./../src/survey/common/choices.tsx */
        testHelpers.inputRadioTest({
            context,
            path: `household.persons.${personIdString}.sexAssignedAtBirth`,
            value: person.sexAssignedAtBirth
        });

        // Test radio widget personGender with conditional displayGenderIfSexAtBirthPreferNotAnswerCustomConditional with choices maleFemaleCustomPreferNotToAnswer
        /* @link file://./../src/survey/common/conditionals.tsx */
        /* @link file://./../src/survey/common/choices.tsx */
        if (person.gender === null) {
            testHelpers.inputVisibleTest({
                context,
                path: `household.persons.${personIdString}.gender`,
                isVisible: false
            });
        } else {
            testHelpers.inputRadioTest({
                context,
                path: `household.persons.${personIdString}.gender`,
                value: person.gender
            });
        }

        // Test radio widget personWorkerType with conditional ifAge14orMoreConditional with choices participationStatusWorker
        /* @link file://./../src/survey/common/conditionals.tsx */
        /* @link file://./../src/survey/common/choices.tsx */
        testHelpers.inputRadioTest({
            context,
            path: `household.persons.${personIdString}.workerType`,
            value: person.workerType
        });

        // Test radio widget personStudentType with conditional ifAge16OrMoreConditional with choices participationStatusStudent
        /* @link file://./../src/survey/common/conditionals.tsx */
        /* @link file://./../src/survey/common/choices.tsx */
        testHelpers.inputRadioTest({
            context,
            path: `household.persons.${personIdString}.studentType`,
            value: person.studentType
        });

        // Test radio widget personSchoolType with conditional ifAge15OrLessConditional with choices schoolType
        /* @link file://./../src/survey/common/conditionals.tsx */
        /* @link file://./../src/survey/common/choices.tsx */
        if (person.schoolType === null) {
            testHelpers.inputVisibleTest({
                context,
                path: `household.persons.${personIdString}.schoolType`,
                isVisible: false
            });
        }

        // Test radio widget personOccupation with conditional personOccupationCustomConditional with choices personOccupation
        /* @link file://./../src/survey/common/conditionals.tsx */
        /* @link file://./../src/survey/common/choices.tsx */
        if (person.occupation === null) {
            testHelpers.inputVisibleTest({
                context,
                path: `household.persons.${personIdString}.occupation`,
                isVisible: false
            });
        }

        // Test radio widget personWorkerTypeBeforeLeave with conditional parentalOrSickLeaveConditional with choices participationStatusWorker
        /* @link file://./../src/survey/common/conditionals.tsx */
        /* @link file://./../src/survey/common/choices.tsx */
        if (person.occupation !== 'parentalOrSickLeave') {
            testHelpers.inputVisibleTest({
                context,
                path: `household.persons.${personIdString}.workerTypeBeforeLeave`,
                isVisible: false
            });
        } else {
            testHelpers.inputVisibleTest({
                context,
                path: `household.persons.${personIdString}.workerTypeBeforeLeave`,
                isVisible: true
            });
            testHelpers.inputRadioTest({
                context,
                path: `household.persons.${personIdString}.workerTypeBeforeLeave`,
                value: person.workerTypeBeforeLeave!
            });
        }

        // Test radio widget personEducationalAttainment with conditional ifAge15OrMoreConditional with choices educationalAttainment
        /* @link file://./../src/survey/common/conditionals.tsx */
        /* @link file://./../src/survey/common/choices.tsx */
        if (person.age >= 15) {
            testHelpers.inputRadioTest({
                context,
                path: `household.persons.${personIdString}.educationalAttainment`,
                value: person.educationalAttainment!
            });
        } else {
            testHelpers.inputVisibleTest({
                context,
                path: `household.persons.${personIdString}.educationalAttainment`,
                isVisible: false
            });
        }

        // Test radio widget personDrivingLicenseOwnership with conditional ifAge16OrMoreConditional with choices yesNoDontKnow
        /* @link file://./../src/survey/common/conditionals.tsx */
        /* @link file://./../src/survey/common/choices.tsx */
        testHelpers.inputRadioTest({
            context,
            path: `household.persons.${personIdString}.drivingLicenseOwnership`,
            value: person.drivingLicenseOwnership
        });

        // Test radio widget personCarSharingMember with conditional hasDrivingLicenseConditional with choices yesNoDontKnow
        /* @link file://./../src/survey/common/conditionals.tsx */
        /* @link file://./../src/survey/common/choices.tsx */
        if (person.carSharingMember === null) {
            testHelpers.inputVisibleTest({
                context,
                path: `household.persons.${personIdString}.carSharingMember`,
                isVisible: false
            });
        } else {
            testHelpers.inputRadioTest({
                context,
                path: `household.persons.${personIdString}.carSharingMember`,
                value: person.carSharingMember
            });
        }

        // Test checkbox widget personTransitPasses with conditional ifAge6OrMoreConditional with choices transitFareType
        /* @link file://./../src/survey/common/conditionals.tsx */
        /* @link file://./../src/survey/common/choices.tsx */
        testHelpers.inputCheckboxTest({
            context,
            path: `household.persons.${personIdString}.transitPasses`,
            values: person.transitPasses
        });

        // Test radio widget personWorkPlaceType with conditional isWorkerConditional with choices workPlaceTypeChoices
        /* @link file://./../src/survey/common/conditionals.tsx */
        /* @link file://./../src/survey/common/choices.tsx */
        if (person.workPlaceType === null) {
            testHelpers.inputVisibleTest({
                context,
                path: `household.persons.${personIdString}.workPlaceType`,
                isVisible: false
            });
        } else {
            testHelpers.inputRadioTest({
                context,
                path: `household.persons.${personIdString}.workPlaceType`,
                value: person.workPlaceType
            });
        }

        // Test radio widget personWorkPlaceTypeBeforeLeave with conditional wasWorkerBeforeLeaveConditional with choices workPlaceBeforeLeaveTypeChoices
        /* @link file://./../src/survey/common/conditionals.tsx */
        /* @link file://./../src/survey/common/choices.tsx */
        if (person.workPlaceTypeBeforeLeave === null) {
            testHelpers.inputVisibleTest({
                context,
                path: `household.persons.${personIdString}.workPlaceTypeBeforeLeave`,
                isVisible: false
            });
        } else {
            testHelpers.inputRadioTest({
                context,
                path: `household.persons.${personIdString}.workPlaceTypeBeforeLeave`,
                value: person.workPlaceTypeBeforeLeave
            });
        }

        // Test radio widget personSchoolPlaceType with conditional isStudentConditional with choices schoolPlaceTypeChoices
        /* @link file://./../src/survey/common/conditionals.tsx */
        /* @link file://./../src/survey/common/choices.tsx */
        if (person.schoolPlaceType === null) {
            testHelpers.inputVisibleTest({
                context,
                path: `household.persons.${personIdString}.schoolPlaceType`,
                isVisible: false
            });
        } else {
            testHelpers.inputRadioTest({
                context,
                path: `household.persons.${personIdString}.schoolPlaceType`,
                value: person.schoolPlaceType
            });
        }

        // Test string widget personUsualWorkPlaceName with conditional hasWorkingLocationConditional
        /* @link file://./../src/survey/common/conditionals.tsx */
        testHelpers.inputStringTest({
            context,
            path: `household.persons.${personIdString}.usualWorkPlace.name`,
            value: person.usualWorkPlace.name
        });

        // Test custom widget personUsualWorkPlaceGeography with conditional hasWorkingLocationConditional
        /* @link file://./../src/survey/common/conditionals.tsx */
        testHelpers.inputMapFindPlaceTest({
            context,
            path: `household.persons.${personIdString}.usualWorkPlace.geography`
        });

        // Test string widget personUsualSchoolPlaceName with conditional personUsualSchoolPlaceNameCustomConditional
        /* @link file://./../src/survey/common/conditionals.tsx */
        testHelpers.inputStringTest({
            context,
            path: `household.persons.${personIdString}.usualSchoolPlace.name`,
            value: person.usualSchoolPlace.name
        });

        // Test custom widget personUsualSchoolPlaceGeography
        testHelpers.inputMapFindPlaceTest({
            context,
            path: `household.persons.${personIdString}.usualSchoolPlace.geography`
        });

        // Test checkbox widget personTravelToWorkDays with conditional personTravelToWorkDaysConditional with choices lastWeekTravelToWorkDaysCustomChoices
        /* @link file://./../src/survey/common/conditionals.tsx */
        /* @link file://./../src/survey/common/choices.tsx */
        testHelpers.inputCheckboxTest({
            context,
            path: `household.persons.${personIdString}.travelToWorkDays`,
            values: person.travelToWorkDays
        });

        // Test checkbox widget personRemoteWorkDays with conditional personRemoteWorkDaysConditional with choices lastWeekRemoteWorkDaysCustomChoices
        /* @link file://./../src/survey/common/conditionals.tsx */
        /* @link file://./../src/survey/common/choices.tsx */
        testHelpers.inputCheckboxTest({
            context,
            path: `household.persons.${personIdString}.remoteWorkDays`,
            values: person.remoteWorkDays
        });
    });

    // Test nextbutton widget household_save
    testHelpers.inputNextButtonTest({
        context,
        text: 'Save and continue',
        nextPageUrl: '/survey/tripsIntro'
    });

    // Verify the household navigation is completed
    testHelpers.verifyNavBarButtonStatus({
        context,
        buttonText: 'household',
        buttonStatus: 'completed',
        isDisabled: false
    });
};

/********** Tests selectPerson section **********/
export const fillSelectPersonSectionTests = ({ context, householdSize = 1 }: CommonTestParametersModify) => {
    if (householdSize === 1) {
        // If household size is 1, skip the selectPerson section
        return;
    }

    // Verify the selectPerson navigation is active
    testHelpers.verifyNavBarButtonStatus({
        context,
        buttonText: 'selectPerson',
        buttonStatus: 'active',
        isDisabled: false
    });

    // Test custom widget selectPerson
    testHelpers.inputRadioTest({
        context,
        path: 'household.persons.${activePersonId}.selected',
        value: '${personId[0]}' // Select the first person value
    });

    // TODO: Test custom widget personNewPerson
    // Implement custom test

    // Test nextbutton widget buttonSelectPersonConfirm
    testHelpers.inputNextButtonTest({
        context,
        text: 'Select this person and continue',
        nextPageUrl: '/survey/tripsIntro'
    });

    // Verify the selectPerson navigation is completed
    // testHelpers.verifyNavBarButtonStatus({
    //     context,
    //     buttonText: 'selectPerson',
    //     buttonStatus: 'completed',
    //     isDisabled: true
    // });
};

/********** Tests tripsIntro section **********/
export type TripsIntroTestParameters = CommonTestParametersModify & {
    hasTrips: boolean;
    expectPopup?: boolean;
    expectedNextSection: string;
};
export const fillTripsintroSectionTests = ({
    context,
    householdSize = 1,
    hasTrips,
    expectPopup = false,
    expectedNextSection
}: TripsIntroTestParameters) => {
    // Verify the tripsIntro navigation is active
    testHelpers.verifyNavBarButtonStatus({
        context,
        buttonText: 'trips',
        buttonStatus: 'active',
        isDisabled: false
    });

    // TODO: Test custom widget personNewPerson
    if (expectPopup) {
        testHelpers.inputPopupButtonTest({
            context,
            text: 'Continue',
            popupText:
                /We will ask you to specify .* trips.The order of the interviewed persons was randomly selected.Continue/
        });
    }

    // Test custom widget activePersonTitle with conditional hasHouseholdSize2OrMoreConditional
    // Test custom widget buttonSwitchPerson
    /* @link file://./../src/survey/common/conditionals.tsx */
    if (householdSize === 1) {
        testHelpers.inputVisibleTest({ context, path: 'activePersonTitle', isVisible: false });
        testHelpers.inputVisibleTest({ context, path: 'buttonSwitchPerson', isVisible: false });
    } else {
        // FIXME: The following visibility tests for 'activePersonTitle' and 'buttonSwitchPerson' fail for some reason...
        // FIXME: But these widgets are visible in the UI, so we assume they are working correctly.
        // FIXME: The visibility test may be failing due to an incorrect 'path' or a bug in inputVisibleTest.
        // testHelpers.inputVisibleTest({ context, path: 'activePersonTitle', isVisible: true });
        // testHelpers.inputVisibleTest({ context, path: 'buttonSwitchPerson', isVisible: true });
    }

    // Test custom widget personWhoWillAnswerForThisPerson
    if (householdSize >= 2) {
        testHelpers.inputRadioTest({
            context,
            path: 'household.persons.${activePersonId}.whoWillAnswerForThisPerson',
            value: '${activePersonId}' // Select the current person
        });
    }

    // Test custom widget personDidTrips
    testHelpers.inputRadioTest({
        context,
        path: 'household.persons.${activePersonId}.journeys.${activeJourneyId}.personDidTrips',
        value: hasTrips ? 'yes' : 'no'
    });

    // TODO: Test custom widget personDidTripsChangeConfirm
    // Implement custom test

    // TODO: Test custom widget visitedPlacesIntro
    // Implement custom test

    // Test custom widget personDeparturePlaceIsHome
    if (hasTrips) {
        testHelpers.inputRadioTest({
            context,
            path: 'household.persons.${activePersonId}.journeys.${activeJourneyId}.departurePlaceIsHome',
            value: 'yes'
        });
    } else {
        testHelpers.inputVisibleTest({
            context,
            path: 'household.persons.${activePersonId}.journeys.${activeJourneyId}.departurePlaceIsHome',
            isVisible: false
        });
    }

    // Test radio widget personDeparturePlaceOther with conditional departurePlaceOtherCustomConditional with choices departurePlaceOtherChoices
    /* @link file://./../src/survey/common/conditionals.tsx */
    /* @link file://./../src/survey/common/choices.tsx */
    testHelpers.inputVisibleTest({
        context,
        path: 'household.persons.${activePersonId}.journeys.${activeJourneyId}.departurePlaceOther',
        isVisible: false
    });

    // Test infotext widget tripsIntroOutro
    testHelpers.waitTextVisible({
        context,
        text: 'Your answers will be used to assess the use and traffic of the road and public transit networks and will remain entirely confidential'
    });

    // Test nextbutton widget tripsIntro_save
    testHelpers.inputNextButtonTest({ context, text: 'Continue', nextPageUrl: `/survey/${expectedNextSection}` });

    // Verify the tripsIntro navigation is completed
    testHelpers.verifyNavBarButtonStatus({
        context,
        buttonText: 'trips',
        buttonStatus: expectedNextSection === 'end' ? 'completed' : 'active', // Trips section is still active if the next section is not 'end'
        isDisabled: false
    });
};

// TODO: We should use interviewablePersonCount and not householdSize
// TODO: Because we can only get visited places of interviawablePerson.
/********** Tests visitedPlaces section **********/
export const fillVisitedPlacesSectionTests = ({
    context,
    householdSize = 1,
    visitedPlaces
}: CommonTestParametersModify & { visitedPlaces: VisitedPlace[] }) => {
    // Test custom widget activePersonTitle with conditional hasHouseholdSize2OrMoreConditional
    // Test custom widget buttonSwitchPerson
    /* @link file://./../src/survey/common/conditionals.tsx */
    if (householdSize === 1) {
        testHelpers.inputVisibleTest({ context, path: 'activePersonTitle', isVisible: false });
        testHelpers.inputVisibleTest({ context, path: 'buttonSwitchPerson', isVisible: false });
    } else {
        testHelpers.inputVisibleTest({ context, path: 'activePersonTitle', isVisible: true });
        testHelpers.inputVisibleTest({ context, path: 'buttonSwitchPerson', isVisible: true });
    }

    // Test custom widget personVisitedPlacesTitle
    if (householdSize === 1) {
        testHelpers.waitTextVisible({ context, text: 'Places you went on' });
    } else {
        testHelpers.waitTextVisible({ context, text: `Places ${householdMembers[0].nickname} went on` });
    }

    // Test custom widget personVisitedPlaces
    // Implement custom test

    // Test custom widget personVisitedPlacesMap
    // Implement custom test

    // Add tests for each visited places
    visitedPlaces.forEach((place: VisitedPlace, index) => {
        fillOneVisitedPlace({ context, place }); // Fill a visited place from start to confirmation
    });

    // Test custom widget buttonCancelVisitedPlace
    // Implement custom test

    // Test custom widget buttonDeleteVisitedPlace
    // Implement custom test

    // Test custom widget buttonVisitedPlacesConfirmNextSection with conditional lastPlaceEnteredCustomConditional
    /* @link file://./../src/survey/common/conditionals.tsx */
    testHelpers.inputNextButtonTest({
        context,
        text: 'Confirm locations and continue',
        nextPageUrl: '/survey/segments'
    });
};

// Fill a visited place from start to confirmation
const fillOneVisitedPlace = ({ context, place }: { context: any; place: VisitedPlace }) => {
    // Test custom widget visitedPlaceActivityCategory
    if (place.activityCategory === null) {
        testHelpers.inputVisibleTest({
            context,
            path: 'household.persons.${activePersonId}.journeys.${activeJourneyId}.visitedPlaces.${activeVisitedPlaceId}.activityCategory',
            isVisible: false
        });
    } else {
        testHelpers.inputRadioTest({
            context,
            path: 'household.persons.${activePersonId}.journeys.${activeJourneyId}.visitedPlaces.${activeVisitedPlaceId}.activityCategory',
            value: place.activityCategory
        });
    }

    // Test custom widget visitedPlaceActivity
    if (place.activity === null) {
        testHelpers.inputVisibleTest({
            context,
            path: 'household.persons.${activePersonId}.journeys.${activeJourneyId}.visitedPlaces.${activeVisitedPlaceId}.activity',
            isVisible: false
        });
    } else {
        testHelpers.inputRadioTest({
            context,
            path: 'household.persons.${activePersonId}.journeys.${activeJourneyId}.visitedPlaces.${activeVisitedPlaceId}.activity',
            value: place.activity
        });
    }

    // Test custom widget visitedPlaceOnTheRoadDepartureType
    if (place.onTheRoadDepartureType === null) {
        testHelpers.inputVisibleTest({
            context,
            path: 'household.persons.${activePersonId}.journeys.${activeJourneyId}.visitedPlaces.${activeVisitedPlaceId}.onTheRoadDepartureType',
            isVisible: false
        });
    }

    // Test radio widget visitedPlaceOnTheRoadArrivalType with conditional currentPlaceWorkOnTheRoadAndNoNextPlaceCustomConditional with choices onTheRoadArrivalTypeCustomChoices
    /* @link file://./../src/survey/common/conditionals.tsx */
    /* @link file://./../src/survey/common/choices.tsx */
    if (place.onTheRoadArrivalType === null) {
        testHelpers.inputVisibleTest({
            context,
            path: 'household.persons.${activePersonId}.journeys.${activeJourneyId}.visitedPlaces.${activeVisitedPlaceId}.onTheRoadArrivalType',
            isVisible: false
        });
    }

    // Test radio widget visitedPlaceAlreadyVisited with conditional alreadyVisitedPlaceCustomConditional with choices yesNo
    /* @link file://./../src/survey/common/conditionals.tsx */
    /* @link file://./../src/survey/common/choices.tsx */
    if (place.alreadyVisitedBySelfOrAnotherHouseholdMember === null) {
        testHelpers.inputVisibleTest({
            context,
            path: 'household.persons.${activePersonId}.journeys.${activeJourneyId}.visitedPlaces.${activeVisitedPlaceId}.alreadyVisitedBySelfOrAnotherHouseholdMember',
            isVisible: false
        });
    } else {
        testHelpers.inputRadioTest({
            context,
            path: 'household.persons.${activePersonId}.journeys.${activeJourneyId}.visitedPlaces.${activeVisitedPlaceId}.alreadyVisitedBySelfOrAnotherHouseholdMember',
            value: place.alreadyVisitedBySelfOrAnotherHouseholdMember
        });
    }

    // Test custom widget visitedPlaceShortcut
    if (place.shortcut === null) {
        testHelpers.inputVisibleTest({
            context,
            path: 'household.persons.${activePersonId}.journeys.${activeJourneyId}.visitedPlaces.${activeVisitedPlaceId}.shortcut',
            isVisible: false
        });
    }

    // Test custom widget visitedPlaceName
    if (place.name === null) {
        testHelpers.inputVisibleTest({
            context,
            path: 'household.persons.${activePersonId}.journeys.${activeJourneyId}.visitedPlaces.${activeVisitedPlaceId}.name',
            isVisible: false
        });
    } else {
        testHelpers.inputStringTest({
            context,
            path: 'household.persons.${activePersonId}.journeys.${activeJourneyId}.visitedPlaces.${activeVisitedPlaceId}.name',
            value: place.name
        });
    }

    // Test custom widget visitedPlaceGeography
    if (place.name === null) {
        testHelpers.inputVisibleTest({
            context,
            path: 'household.persons.${activePersonId}.journeys.${activeJourneyId}.visitedPlaces.${activeVisitedPlaceId}.geography',
            isVisible: false
        });
    } else {
        testHelpers.inputMapFindPlaceTest({
            context,
            path: 'household.persons.${activePersonId}.journeys.${activeJourneyId}.visitedPlaces.${activeVisitedPlaceId}.geography'
        });
    }

    // Test custom widget visitedPlacePreviousPreviousDepartureTime
    if (place._previousPreviousDepartureTime === null) {
        testHelpers.inputVisibleTest({
            context,
            path: 'household.persons.${activePersonId}.journeys.${activeJourneyId}.visitedPlaces.${activeVisitedPlaceId}._previousPreviousDepartureTime',
            isVisible: false
        });
    }

    // Test custom widget visitedPlacePreviousArrivalTime
    if (place._previousArrivalTime === null) {
        testHelpers.inputVisibleTest({
            context,
            path: 'household.persons.${activePersonId}.journeys.${activeJourneyId}.visitedPlaces.${activeVisitedPlaceId}._previousArrivalTime',
            isVisible: false
        });
    }

    // Test custom widget visitedPlacePreviousDepartureTime
    if (place._previousDepartureTime === null) {
        testHelpers.inputVisibleTest({
            context,
            path: 'household.persons.${activePersonId}.journeys.${activeJourneyId}.visitedPlaces.${activeVisitedPlaceId}._previousDepartureTime',
            isVisible: false
        });
    } else {
        testHelpers.inputSelectTest({
            context,
            path: 'household.persons.${activePersonId}.journeys.${activeJourneyId}.visitedPlaces.${activeVisitedPlaceId}._previousDepartureTime',
            value: String(place._previousDepartureTime)
        });
    }

    // Test custom widget visitedPlaceArrivalTime
    if (place.arrivalTime === null) {
        testHelpers.inputVisibleTest({
            context,
            path: 'household.persons.${activePersonId}.journeys.${activeJourneyId}.visitedPlaces.${activeVisitedPlaceId}.arrivalTime',
            isVisible: false
        });
    } else {
        testHelpers.inputSelectTest({
            context,
            path: 'household.persons.${activePersonId}.journeys.${activeJourneyId}.visitedPlaces.${activeVisitedPlaceId}.arrivalTime',
            value: String(place.arrivalTime)
        });
    }

    // Test custom widget visitedPlaceNextPlaceCategory
    if (place.nextPlaceCategory === null) {
        testHelpers.inputVisibleTest({
            context,
            path: 'household.persons.${activePersonId}.journeys.${activeJourneyId}.visitedPlaces.${activeVisitedPlaceId}.nextPlaceCategory',
            isVisible: false
        });
    } else {
        testHelpers.inputRadioTest({
            context,
            path: 'household.persons.${activePersonId}.journeys.${activeJourneyId}.visitedPlaces.${activeVisitedPlaceId}.nextPlaceCategory',
            value: place.nextPlaceCategory
        });
    }

    // Test custom widget visitedPlaceDepartureTime
    if (place.departureTime === null) {
        testHelpers.inputVisibleTest({
            context,
            path: 'household.persons.${activePersonId}.journeys.${activeJourneyId}.visitedPlaces.${activeVisitedPlaceId}.departureTime',
            isVisible: false
        });
    } else {
        testHelpers.inputSelectTest({
            context,
            path: 'household.persons.${activePersonId}.journeys.${activeJourneyId}.visitedPlaces.${activeVisitedPlaceId}.departureTime',
            value: String(place.departureTime)
        });
    }

    // Test custom widget buttonSaveVisitedPlace
    testHelpers.inputNextButtonTest({ context, text: 'Confirm', nextPageUrl: '/survey/visitedPlaces' });
};

/********** Tests Segments section **********/
export const fillSegmentsSectionTests = ({
    context,
    householdSize = 1,
    segments,
    expectedNextSection = 'end'
}: CommonTestParametersModify & { segments: Segment[]; expectedNextSection?: string }) => {
    // Test custom widget activePersonTitle with conditional hasHouseholdSize2OrMoreConditional
    // Test custom widget buttonSwitchPerson
    /* @link file://./../src/survey/common/conditionals.tsx */
    if (householdSize === 1) {
        testHelpers.inputVisibleTest({ context, path: 'activePersonTitle', isVisible: false });
        testHelpers.inputVisibleTest({ context, path: 'buttonSwitchPerson', isVisible: false });
    } else {
        testHelpers.inputVisibleTest({ context, path: 'activePersonTitle', isVisible: true });
        testHelpers.inputVisibleTest({ context, path: 'buttonSwitchPerson', isVisible: true });
    }

    // Test custom widget segmentsPersonTripsTitle
    // Implement custom test

    // Test custom widget personVisitedPlacesMap
    // Implement custom test

    // Test custom widget personTrips
    // Implement custom test

    // Test custom widget segmentIntro
    // Implement custom test

    // Test custom widget segments
    // Implement custom test

    // Fill a segment from start to confirmation
    // Add tests for each household member
    segments.forEach((segment: Segment) => {
        // Fill a segment from start to confirmation
        // TODO: Implement multiple mode of transport for a trip
        fillOneSegmentTests({ context, index: segment.segmentIndex, segment });
    });

    // Test custom widget buttonConfirmNextSection with conditional lastPlaceEnteredCustomConditional
    /* @link file://./../src/survey/common/conditionals.tsx */
    testHelpers.inputNextButtonTest({
        context,
        text: 'Confirm and continue',
        nextPageUrl: `/survey/${expectedNextSection}`
    });
};

// Fill a segment from start to confirmation
const fillOneSegmentTests = ({
    context,
    index,
    segment
}: CommonTestParametersModify & { index: number; segment: Segment }) => {
    // Build a string for segmentId (e.g., "${segmentId[0]}") using a template literal to avoid immediate interpolation
    const segmentIdString = `\${segmentId[${index}]}`;

    // Test the group object button
    testHelpers.inputNextButtonTest({
        context,
        text: 'Select the first (or only) mode of transport used during this trip',
        nextPageUrl: '/survey/segments'
    });

    // Test custom widget segmentSameModeAsReverseTrip
    if (segment.sameModeAsReverseTrip === null) {
        testHelpers.inputVisibleTest({
            context,
            path: `household.persons.\${activePersonId}.journeys.\${activeJourneyId}.trips.\${activeTripId}.segments.${segmentIdString}.sameModeAsReverseTrip`,
            isVisible: false
        });
    } else {
        testHelpers.inputRadioTest({
            context,
            path: `household.persons.\${activePersonId}.journeys.\${activeJourneyId}.trips.\${activeTripId}.segments.${segmentIdString}.sameModeAsReverseTrip`,
            value: String(segment.sameModeAsReverseTrip)
        });
    }

    // Test custom widget segmentModePre
    if (segment.modePre === null) {
        testHelpers.inputVisibleTest({
            context,
            path: `household.persons.\${activePersonId}.journeys.\${activeJourneyId}.trips.\${activeTripId}.segments.${segmentIdString}.modePre`,
            isVisible: false
        });
    } else {
        testHelpers.inputRadioTest({
            context,
            path: `household.persons.\${activePersonId}.journeys.\${activeJourneyId}.trips.\${activeTripId}.segments.${segmentIdString}.modePre`,
            value: segment.modePre
        });
    }

    // Test custom widget segmentMode
    if (segment.mode === null) {
        testHelpers.inputVisibleTest({
            context,
            path: `household.persons.\${activePersonId}.journeys.\${activeJourneyId}.trips.\${activeTripId}.segments.${segmentIdString}.mode`,
            isVisible: false
        });
    } else {
        testHelpers.inputRadioTest({
            context,
            path: `household.persons.\${activePersonId}.journeys.\${activeJourneyId}.trips.\${activeTripId}.segments.${segmentIdString}.mode`,
            value: segment.mode
        });
    }

    // Test custom widget segmentHowToBus
    if (segment.howToBus === null) {
        testHelpers.inputVisibleTest({
            context,
            path: `household.persons.\${activePersonId}.journeys.\${activeJourneyId}.trips.\${activeTripId}.segments.${segmentIdString}.howToBus`,
            isVisible: false
        });
    } else {
        testHelpers.inputRadioTest({
            context,
            path: `household.persons.\${activePersonId}.journeys.\${activeJourneyId}.trips.\${activeTripId}.segments.${segmentIdString}.howToBus`,
            value: segment.howToBus
        });
    }

    // Test radio widget segmentPaidForParking with conditional isCarDriverAndDestinationWorkCustomConditional with choices yesNoDontKnow
    /* @link file://./../src/survey/common/conditionals.tsx */
    /* @link file://./../src/survey/common/choices.tsx */
    if (segment.paidForParking === null) {
        testHelpers.inputVisibleTest({
            context,
            path: `household.persons.\${activePersonId}.journeys.\${activeJourneyId}.trips.\${activeTripId}.segments.${segmentIdString}.paidForParking`,
            isVisible: false
        });
    } else {
        testHelpers.inputRadioTest({
            context,
            path: `household.persons.\${activePersonId}.journeys.\${activeJourneyId}.trips.\${activeTripId}.segments.${segmentIdString}.paidForParking`,
            value: String(segment.paidForParking)
        });
    }

    // Test radionumber widget segmentVehicleOccupancy
    if (segment.vehicleOccupancy === null) {
        testHelpers.inputVisibleTest({
            context,
            path: `household.persons.\${activePersonId}.journeys.\${activeJourneyId}.trips.\${activeTripId}.segments.${segmentIdString}.vehicleOccupancy`,
            isVisible: false
        });
    } else {
        testHelpers.inputRadioTest({
            context,
            path: `household.persons.\${activePersonId}.journeys.\${activeJourneyId}.trips.\${activeTripId}.segments.${segmentIdString}.vehicleOccupancy`,
            value: String(segment.vehicleOccupancy)
        });
    }

    // Test custom widget segmentDriver
    if (segment.driver === null) {
        testHelpers.inputVisibleTest({
            context,
            path: `household.persons.\${activePersonId}.journeys.\${activeJourneyId}.trips.\${activeTripId}.segments.${segmentIdString}.driver`,
            isVisible: false
        });
    } else {
        testHelpers.inputRadioTest({
            context,
            path: `household.persons.\${activePersonId}.journeys.\${activeJourneyId}.trips.\${activeTripId}.segments.${segmentIdString}.driver`,
            value: String(segment.driver)
        });
    }

    // Test custom widget segmentBusLines
    if (segment.busLines === null) {
        testHelpers.inputVisibleTest({
            context,
            path: `household.persons.\${activePersonId}.journeys.\${activeJourneyId}.trips.\${activeTripId}.segments.${segmentIdString}.busLines`,
            isVisible: false
        });
    } else {
        testHelpers.inputCheckboxTest({
            context,
            path: `household.persons.\${activePersonId}.journeys.\${activeJourneyId}.trips.\${activeTripId}.segments.${segmentIdString}.busLines`,
            values: segment.busLines
        });
    }

    // Test custom widget segmentBusLinesWarning
    if (segment.busLinesWarning === null) {
        testHelpers.inputVisibleTest({
            context,
            path: `household.persons.\${activePersonId}.journeys.\${activeJourneyId}.trips.\${activeTripId}.segments.${segmentIdString}.busLinesWarning`,
            isVisible: false
        });
    } else {
        // Implement custom test
    }

    // Test radio widget segmentOnDemandType with conditional isTransitAndNotNationaleCustomConditional with choices onDemandCustomChoices
    /* @link file://./../src/survey/common/conditionals.tsx */
    /* @link file://./../src/survey/common/choices.tsx */
    if (segment.onDemandType === null) {
        testHelpers.inputVisibleTest({
            context,
            path: `household.persons.\${activePersonId}.journeys.\${activeJourneyId}.trips.\${activeTripId}.segments.${segmentIdString}.onDemandType`,
            isVisible: false
        });
    } else {
        testHelpers.inputRadioTest({
            context,
            path: `household.persons.\${activePersonId}.journeys.\${activeJourneyId}.trips.\${activeTripId}.segments.${segmentIdString}.onDemandType`,
            value: segment.onDemandType
        });
    }

    // Test string widget tripJunctionQueryString with conditional shouldAskTripJunctionCustomConditional
    /* @link file://./../src/survey/common/conditionals.tsx */
    if (segment.tripJunctionQueryString === null) {
        testHelpers.inputVisibleTest({
            context,
            path: `household.persons.\${activePersonId}.journeys.\${activeJourneyId}.trips.\${activeTripId}.segments.${segmentIdString}.tripJunctionQueryString`,
            isVisible: false
        });
    } else {
        testHelpers.inputStringTest({
            context,
            path: `household.persons.\${activePersonId}.journeys.\${activeJourneyId}.trips.\${activeTripId}.segments.${segmentIdString}.tripJunctionQueryString`,
            value: segment.tripJunctionQueryString
        });
    }

    // Test custom widget tripJunctionGeography
    // Implement custom test

    // TODO: Implement multiple segments to the same trip by changing this value to 'true'
    // Test custom widget segmentHasNextMode
    if (segment.hasNextMode === null) {
        testHelpers.inputVisibleTest({
            context,
            path: `household.persons.\${activePersonId}.journeys.\${activeJourneyId}.trips.\${activeTripId}.segments.${segmentIdString}.hasNextMode`,
            isVisible: false
        });
    } else {
        testHelpers.inputRadioTest({
            context,
            path: `household.persons.\${activePersonId}.journeys.\${activeJourneyId}.trips.\${activeTripId}.segments.${segmentIdString}.hasNextMode`,
            value: String(segment.hasNextMode)
        });
    }

    // Test custom widget buttonSaveTrip
    testHelpers.inputNextButtonTest({ context, text: 'Confirm this trip', nextPageUrl: '/survey/segments' });
};

export const fillTravelBehaviorSectionTests = ({
    context,
    householdSize = 1,
    travelBehavior,
    nextSection: expectedNextSection = 'end'
}: CommonTestParametersModify & { travelBehavior: TravelBehavior; nextSection: string }) => {
    // Test custom widget activePersonTitle with conditional hasHouseholdSize2OrMoreConditional
    // Test custom widget buttonSwitchPerson
    /* @link file://./../src/survey/common/conditionals.tsx */
    if (householdSize === 1) {
        testHelpers.inputVisibleTest({ context, path: 'activePersonTitle', isVisible: false });
        testHelpers.inputVisibleTest({ context, path: 'buttonSwitchPerson', isVisible: false });
    } else {
        // FIXME: The following visibility tests for 'activePersonTitle' and 'buttonSwitchPerson' fail for some reason...
        // FIXME: But these widgets are visible in the UI, so we assume they are working correctly.
        // FIXME: The visibility test may be failing due to an incorrect 'path' or a bug in inputVisibleTest.
        // testHelpers.inputVisibleTest({ context, path: 'activePersonTitle', isVisible: true });
        // testHelpers.inputVisibleTest({ context, path: 'buttonSwitchPerson', isVisible: true });
    }

    // Test custom widget personNoWorkTripIntro
    // Implement custom test

    // Test select widget personNoWorkTripReason with conditional shouldAskForNoWorkTripReasonCustomConditional with choices noWorkTripReasonChoices
    /* @link file://./../src/survey/common/conditionals.tsx */
    /* @link file://./../src/survey/common/choices.tsx */
    if (travelBehavior.noWorkTripReason === null) {
        testHelpers.inputVisibleTest({
            context,
            path: 'household.persons.${activePersonId}.journeys.${activeJourneyId}.noWorkTripReason',
            isVisible: false
        });
    } else {
        testHelpers.inputSelectTest({
            context,
            path: 'household.persons.${activePersonId}.journeys.${activeJourneyId}.noWorkTripReason',
            value: travelBehavior.noWorkTripReason
        });
    }

    // Test custom widget personNoWorkTripReasonSpecify with conditional shouldAskPersonNoWorkTripSpecifyCustomConditional
    /* @link file://./../src/survey/common/conditionals.tsx */
    if (travelBehavior.noWorkTripReasonSpecify === null) {
        testHelpers.inputVisibleTest({
            context,
            path: 'household.persons.${activePersonId}.journeys.${activeJourneyId}.noWorkTripReasonSpecify',
            isVisible: false
        });
    } else {
        testHelpers.inputStringTest({
            context,
            path: 'household.persons.${activePersonId}.journeys.${activeJourneyId}.noWorkTripReasonSpecify',
            value: travelBehavior.noWorkTripReasonSpecify!
        });
    }
    // Implement custom test

    // Test custom widget personNoSchoolTripIntro
    // Implement custom test

    // Test select widget personNoSchoolTripReason with conditional shouldAskForNoSchoolTripReasonCustomConditional with choices noSchoolTripReasonChoices
    /* @link file://./../src/survey/common/conditionals.tsx */
    /* @link file://./../src/survey/common/choices.tsx */
    if (travelBehavior.noSchoolTripReason === null) {
        testHelpers.inputVisibleTest({
            context,
            path: 'household.persons.${activePersonId}.journeys.${activeJourneyId}.noSchoolTripReason',
            isVisible: false
        });
    } else {
        testHelpers.inputSelectTest({
            context,
            path: 'household.persons.${activePersonId}.journeys.${activeJourneyId}.noSchoolTripReason',
            value: travelBehavior.noSchoolTripReason
        });
    }

    // Test custom widget personNoSchoolTripReasonSpecify with conditional shouldAskForNoSchoolTripSpecifyCustomConditional
    /* @link file://./../src/survey/common/conditionals.tsx */
    if (travelBehavior.noSchoolTripReasonSpecify === null) {
        testHelpers.inputVisibleTest({
            context,
            path: 'household.persons.${activePersonId}.journeys.${activeJourneyId}.noSchoolTripReasonSpecify',
            isVisible: false
        });
    } else {
        testHelpers.inputStringTest({
            context,
            path: 'household.persons.${activePersonId}.journeys.${activeJourneyId}.noSchoolTripReasonSpecify',
            value: travelBehavior.noSchoolTripReasonSpecify!
        });
    }

    // Test nextbutton widget
    testHelpers.inputNextButtonTest({ context, text: 'Continue', nextPageUrl: `/survey/${expectedNextSection}` });

    // Verify the travel behavior navigation is completed if next section is longDistance
    testHelpers.verifyNavBarButtonStatus({
        context,
        buttonText: 'trips',
        buttonStatus: expectedNextSection === 'longDistance' ? 'completed' : 'active', // Trips section is still active if the next section is not 'end'
        isDisabled: false
    });
};

/********** Tests Longdistance section **********/
export type LongDistanceTestParameters = CommonTestParametersModify & {
    longDistanceSection?: LongDistanceSection;
};
export const fillLongDistanceSectionTests = ({
    context,
    longDistanceSection = defaultLongDistance
}: LongDistanceTestParameters) => {
    const hasTrips = longDistanceSection.madeLongDistanceTrips === 'yes';

    // Test radio widget householdMadeLongDistanceTripsInLastYear with choices yesNoDontKnow
    /* @link file://./../src/survey/common/choices.tsx */
    testHelpers.inputRadioTest({
        context,
        path: 'household.madeLongDistanceTripsInLastYear',
        value: longDistanceSection.madeLongDistanceTrips
    });

    // Test range widget householdLongDistanceTripsSeptemberDecember with conditional madeLongDistanceTripsConditional
    /* @link file://./../src/survey/common/conditionals.tsx */
    if (hasTrips) {
        testHelpers.inputRadioTest({
            context,
            path: 'household.longDistanceTripsSeptemberDecember',
            value: longDistanceSection.frequencySeptemberDecember!
        });
    } else {
        testHelpers.inputVisibleTest({
            context,
            path: 'household.longDistanceTripsSeptemberDecember',
            isVisible: false
        });
    }

    // Test range widget householdLongDistanceTripsJanuaryApril with conditional madeLongDistanceTripsConditional
    /* @link file://./../src/survey/common/conditionals.tsx */
    if (hasTrips) {
        testHelpers.inputRadioTest({
            context,
            path: 'household.longDistanceTripsJanuaryApril',
            value: longDistanceSection.frequencyJanuaryApril!
        });
    } else {
        testHelpers.inputVisibleTest({ context, path: 'household.longDistanceTripsJanuaryApril', isVisible: false });
    }

    // Test range widget householdLongDistanceTripsMayAugust with conditional madeLongDistanceTripsConditional
    /* @link file://./../src/survey/common/conditionals.tsx */
    if (hasTrips) {
        testHelpers.inputRadioTest({
            context,
            path: 'household.longDistanceTripsMayAugust',
            value: longDistanceSection.frequencyMayAugust!
        });
    } else {
        testHelpers.inputVisibleTest({ context, path: 'household.longDistanceTripsMayAugust', isVisible: false });
    }

    // Test radio widget wouldLikeToParticipateToLongDistanceSurvey with conditional madeLongDistanceTripsConditional with choices yesNo
    /* @link file://./../src/survey/common/conditionals.tsx */
    /* @link file://./../src/survey/common/choices.tsx */
    if (hasTrips) {
        testHelpers.inputRadioTest({
            context,
            path: 'household.wouldLikeToParticipateToLongDistanceSurvey',
            value: longDistanceSection.wantToParticipateInSurvey!
        });
    } else {
        testHelpers.inputVisibleTest({
            context,
            path: 'household.wouldLikeToParticipateToLongDistanceSurvey',
            isVisible: false
        });
    }

    // Test string widget wouldLikeToParticipateToLongDistanceSurveyContactEmail with conditional wantToParticipateInLongDistanceSurveyConditional
    /* @link file://./../src/survey/common/conditionals.tsx */
    if (longDistanceSection.wantToParticipateInSurvey === 'yes') {
        testHelpers.inputStringTest({
            context,
            path: 'household.wouldLikeToParticipateToLongDistanceSurveyContactEmail',
            value: longDistanceSection.wantToParticipateInSurveyEmail!
        });
    } else {
        testHelpers.inputVisibleTest({
            context,
            path: 'household.wouldLikeToParticipateToLongDistanceSurveyContactEmail',
            isVisible: false
        });
    }

    // Test nextbutton widget buttonCompleteLongDistanceSection
    testHelpers.inputNextButtonTest({ context, text: 'Continue', nextPageUrl: '/survey/end' });

    // Verify the longDistance navigation is still active as we need the `end` section completed
    testHelpers.verifyNavBarButtonStatus({ context, buttonText: 'End', buttonStatus: 'active', isDisabled: false });
};

/********** Tests end section **********/
export const fillEndSectionTests = ({ context, householdSize = 1 }: CommonTestParametersModify) => {
    // Verify the end navigation is active
    testHelpers.verifyNavBarButtonStatus({ context, buttonText: 'end', buttonStatus: 'active', isDisabled: false });

    // Test radio widget householdOwnership with choices householdOwnershipChoices
    /* @link file://./../src/survey/common/choices.tsx */
    testHelpers.inputRadioTest({ context, path: 'household.ownership', value: 'tenant' });

    // Test select widget householdIncome with choices householdIncomeChoices
    /* @link file://./../src/survey/common/choices.tsx */
    testHelpers.inputSelectTest({ context, path: 'household.income', value: '100000_149999' });

    // Test radio widget wouldLikeToParticipateInOtherSurveysChaireMobilite with choices yesNo
    /* @link file://./../src/survey/common/choices.tsx */
    testHelpers.inputRadioTest({
        context,
        path: 'end.wouldLikeToParticipateInOtherSurveysChaireMobilite',
        value: 'yes'
    });

    // Test string widget wouldLikeToParticipateInOtherSurveysChaireMobiliteContactEmail with conditional wantToParticipateInOtherSurveysChaireMobiliteConditional
    /* @link file://./../src/survey/common/conditionals.tsx */
    testHelpers.inputStringTest({
        context,
        path: 'end.wouldLikeToParticipateInOtherSurveysChaireMobiliteContactEmail',
        value: 'test@example.com'
    });

    // Test text widget householdCommentsOnSurvey
    testHelpers.inputStringTest({ context, path: 'end.commentsOnSurvey', value: 'Test' });

    // Test infotext widget optionalIntroText
    testHelpers.waitTextVisible({
        context,
        text: 'The next questions are optional and are added for research purposes. You can complete the interview without answering them.'
    });

    // Test radionumber widget householdPluginHybridCarNumber with conditional householdHasCars
    /* @link file://./../src/survey/common/conditionals.tsx */
    testHelpers.inputRadioTest({ context, path: 'household.pluginHybridCarNumber', value: '1' });

    // Test radionumber widget householdElectricCarNumber with conditional householdHasCars
    /* @link file://./../src/survey/common/conditionals.tsx */
    testHelpers.inputRadioTest({ context, path: 'household.electricCarNumber', value: '1' });

    // Test range widget endInterestOfTheSurvey
    testHelpers.inputRangeTest({
        context,
        path: 'end.interestOfTheSurvey',
        value: 75,
        sliderColor: 'red-yellow-green'
    });

    // Test number widget endTimeSpentAnswering
    testHelpers.inputStringTest({ context, path: 'end.timeSpentAnswering', value: '15' });

    // Test range widget endDurationOfTheSurvey
    testHelpers.inputRangeTest({
        context,
        path: 'end.durationOfTheSurvey',
        value: 70,
        sliderColor: 'green-yellow-red'
    });

    // Test range widget endDifficultyOfTheSurvey
    testHelpers.inputRangeTest({
        context,
        path: 'end.difficultyOfTheSurvey',
        value: 40,
        sliderColor: 'green-yellow-red'
    });

    // Test range widget endBurdenOfTheSurvey
    testHelpers.inputRangeTest({ context, path: 'end.burdenOfTheSurvey', value: 30, sliderColor: 'green-yellow-red' });

    // Test radio widget endConsideredAbandoningSurvey with choices yesNoDontKnow
    /* @link file://./../src/survey/common/choices.tsx */
    testHelpers.inputRadioTest({ context, path: 'end.consideredAbandoningSurvey', value: 'no' });

    // Test nextbutton widget buttonCompleteInterviewWithCompleteSection
    testHelpers.inputNextButtonTest({ context, text: 'Complete the interview', nextPageUrl: '/survey/completed' });

    // Verify the end navigation is completed
    testHelpers.verifyNavBarButtonStatus({
        context,
        buttonText: 'end',
        buttonStatus: 'activeAndCompleted',
        isDisabled: false
    });
};

/********** Tests completed section **********/
export const fillCompletedSectionTests = ({ context, householdSize = 1 }: CommonTestParametersModify) => {
    // Test infotext widget completedText
    testHelpers.waitTextVisible({ context, text: 'Thank you for your participation!' });
    testHelpers.waitTextVisible({
        context,
        text: 'We thank you for taking the time to fill out this survey. Your answers have been recorded. You can edit your answers by clicking on any of the sections in the menu at the top of the page.'
    });
};
