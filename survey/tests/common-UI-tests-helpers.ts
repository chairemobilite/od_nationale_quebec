import { test } from '@playwright/test';
import knex from 'chaire-lib-backend/lib/config/shared/db.config';
import * as testHelpers from 'evolution-frontend/tests/ui-testing/testHelpers';
import { SurveyObjectDetector } from 'evolution-frontend/tests/ui-testing/SurveyObjectDetectors';

const context = {
    page: null as any,
    objectDetector: new SurveyObjectDetector(),
    title: '',
    widgetTestCounters: {}
};

// Function to run in the `afterAll` hook to delete the participant interview, to allow retries to reset the state to its original value
export const deleteParticipantInterview = async (accessCode: string) => {
    try {
        // Delete the participant interview with the access code
        await knex('sv_participants').del().whereILike('username', `${accessCode}-%`);
    } catch (error) {
        console.error(`Error deleting participant with access code ${accessCode}`, error);
    }
}

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
    gender: string;
    workerType: string;
    studentType: string;
    schoolType: string | null;
    occupation: string | null;
    workerTypeBeforeLeave: string | null;
    educationalAttainment: string | null;
    drivingLicenseOwnership: string;
    carSharingMember: string | null;
    transitFares: string[];
    hasDisability: string;
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
    travelToStudyDays: string[];
    remoteStudyDays: string[];
};

const householdMembers: HouseholdMember[] = [
    {
        personIndex: 0,
        nickname: 'Martha',
        age: 30,
        gender: 'female',
        workerType: 'fullTime',
        studentType: 'partTime',
        schoolType: null, // Not applicable for this person
        occupation: null, // Not applicable for this person
        workerTypeBeforeLeave: null, // Not applicable for this person
        educationalAttainment: 'postSecondaryNonTertiaryEducation',
        drivingLicenseOwnership: 'yes',
        carSharingMember: 'yes',
        transitFares: ['transitPass'],
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
        remoteWorkDays: ['no'],
        travelToStudyDays: ['no'],
        remoteStudyDays: ['no']
    }
];

/********** Tests home section **********/
export const fillHomeSectionTests = ({ context, householdSize = 1, addressIsFilled = true }: CommonTestParametersModify) => {
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
    testHelpers.waitTextVisible({ context, text: 'Please enter the email or phone number to get in contact.' });

    // Test string widget contactEmail with conditional acceptsToBeContactedForHelp
    /* @link file://./../src/survey/common/conditionals.tsx */
    testHelpers.inputStringTest({ context, path: 'contactEmail', value: 'test@test.com' });

    // Test string widget phoneNumber with conditional acceptsToBeContactedForHelp
    /* @link file://./../src/survey/common/conditionals.tsx */
    testHelpers.inputStringTest({ context, path: 'phoneNumber', value: '123-456-7890' });

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
            gender: 'male',
            workerType: 'partTime',
            studentType: 'fullTime',
            schoolType: null, // Not applicable for this person
            occupation: null, // Not applicable for this person
            workerTypeBeforeLeave: null, // Not applicable for this person
            educationalAttainment: 'bachelorOrHigher',
            drivingLicenseOwnership: 'no',
            carSharingMember: null, // Not applicable for this person
            transitFares: ['transitPass'],
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
            remoteWorkDays: ['no'],
            travelToStudyDays: ['no'],
            remoteStudyDays: ['no']
        });
    }

    // Add tests for each household member
    householdMembers.forEach((person: HouseholdMember, index) => {
        // Build a string for personId (e.g., "${personId[0]}") using a template literal to avoid immediate interpolation
        const personIdString = `\${personId[${index}]}`;

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

        // Test number widget personAge
        testHelpers.inputStringTest({
            context,
            path: `household.persons.${personIdString}.age`,
            value: person.age.toString()
        });

        // Test radio widget personGender with conditional ifAge5orMoreConditional with choices gender
        /* @link file://./../src/survey/common/conditionals.tsx */
        /* @link file://./../src/survey/common/choices.tsx */
        testHelpers.inputRadioTest({
            context,
            path: `household.persons.${personIdString}.gender`,
            value: person.gender
        });

        // Test radio widget personWorkerType with conditional ifAge14orMoreConditional with choices participationStatus
        /* @link file://./../src/survey/common/conditionals.tsx */
        /* @link file://./../src/survey/common/choices.tsx */
        testHelpers.inputRadioTest({
            context,
            path: `household.persons.${personIdString}.workerType`,
            value: person.workerType
        });

        // Test radio widget personStudentType with conditional ifAge16OrMoreConditional with choices participationStatus
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

        // Test radio widget personWorkerTypeBeforeLeave with conditional parentalOrSickLeaveConditional with choices participationStatus
        /* @link file://./../src/survey/common/conditionals.tsx */
        /* @link file://./../src/survey/common/choices.tsx */
        if (person.occupation !== 'parentalOrSickLeave') {
            testHelpers.inputVisibleTest({ context, path: `household.persons.${personIdString}.workerTypeBeforeLeave`, isVisible: false });
        } else {
            testHelpers.inputVisibleTest({ context, path: `household.persons.${personIdString}.workerTypeBeforeLeave`, isVisible: true });
            testHelpers.inputRadioTest({ context, path: `household.persons.${personIdString}.workerTypeBeforeLeave`, value: person.workerTypeBeforeLeave! });
        }

        // Test radio widget personEducationalAttainment with conditional ifAge15OrMoreConditional with choices educationalAttainment
        /* @link file://./../src/survey/common/conditionals.tsx */
        /* @link file://./../src/survey/common/choices.tsx */
        if (person.age >= 15) {
            testHelpers.inputRadioTest({ context, path: `household.persons.${personIdString}.educationalAttainment`, value: person.educationalAttainment! });
        } else {
            testHelpers.inputVisibleTest({ context, path: `household.persons.${personIdString}.educationalAttainment`, isVisible: false });
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

        // Test checkbox widget personTransitFares with conditional ifAge6OrMoreConditional with choices transitFareType
        /* @link file://./../src/survey/common/conditionals.tsx */
        /* @link file://./../src/survey/common/choices.tsx */
        testHelpers.inputCheckboxTest({
            context,
            path: `household.persons.${personIdString}.transitFares`,
            values: person.transitFares
        });

        // Test radio widget personHasDisability with conditional hasOnePersonWithDisabilityOrHhSize1Conditional with choices yesNoPreferNotToAnswer
        /* @link file://./../src/survey/common/conditionals.tsx */
        /* @link file://./../src/survey/common/choices.tsx */
        testHelpers.inputRadioTest({
            context,
            path: `household.persons.${personIdString}.hasDisability`,
            value: person.hasDisability
        });

        

        // Test radio widget personWorkPlaceType with conditional isWorkerConditional with choices workPlaceTypeChoices
        /* @link file://./../src/survey/common/conditionals.tsx */
        /* @link file://./../src/survey/common/choices.tsx */
        if (person.workPlaceType === null) {
            testHelpers.inputVisibleTest({ context, path: `household.persons.${personIdString}.workPlaceType`, isVisible: false });
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
            testHelpers.inputVisibleTest({ context, path: `household.persons.${personIdString}.workPlaceTypeBeforeLeave`, isVisible: false });
        } else {
            testHelpers.inputRadioTest({ context, path: `household.persons.${personIdString}.workPlaceTypeBeforeLeave`, value: person.workPlaceTypeBeforeLeave });
        }

        // Test radio widget personSchoolPlaceType with conditional isStudentConditional with choices schoolPlaceTypeChoices
        /* @link file://./../src/survey/common/conditionals.tsx */
        /* @link file://./../src/survey/common/choices.tsx */
        if (person.schoolPlaceType === null) {
            testHelpers.inputVisibleTest({ context, path: `household.persons.${personIdString}.schoolPlaceType`, isVisible: false });
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

        // Test checkbox widget personTravelToStudyDays with conditional personTravelToStudyDaysConditional with choices lastWeekTravelToStudyDaysCustomChoices
        /* @link file://./../src/survey/common/conditionals.tsx */
        /* @link file://./../src/survey/common/choices.tsx */
        testHelpers.inputCheckboxTest({
            context,
            path: `household.persons.${personIdString}.travelToStudyDays`,
            values: person.travelToStudyDays
        });

        // Test checkbox widget personRemoteStudyDays with conditional personRemoteStudyDaysConditional with choices lastWeekRemoteStudyDaysCustomChoices
        /* @link file://./../src/survey/common/conditionals.tsx */
        /* @link file://./../src/survey/common/choices.tsx */
        testHelpers.inputCheckboxTest({
            context,
            path: `household.persons.${personIdString}.remoteStudyDays`,
            values: person.remoteStudyDays
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
type TripsIntroTestParameters = CommonTestParametersModify & {
    expectPopup?: boolean;
};
export const fillTripsintroSectionTests = ({ context, householdSize = 1, expectPopup = false }: TripsIntroTestParameters) => {
    // Verify the tripsIntro navigation is active
    testHelpers.verifyNavBarButtonStatus({
        context,
        buttonText: 'trips',
        buttonStatus: 'active',
        isDisabled: false
    });

    // Add tests for each household member
    householdMembers.forEach((person: HouseholdMember, index) => {
        // Test custom widget activePersonTitle with conditional hasHouseholdSize2OrMoreConditional
        /* @link file://./../src/survey/common/conditionals.tsx */
        testHelpers.inputVisibleTest({ context, path: 'activePersonTitle', isVisible: false });

        // Test custom widget buttonSwitchPerson
        // testHelpers.inputNextButtonTest({
        //     context,
        //     text: 'Change person',
        //     nextPageUrl: '/survey/selectPerson'
        // });

        // TODO: Test custom widget personNewPerson
        if (expectPopup) {
            testHelpers.inputPopupButtonTest({
                context,
                text: 'Continue',
                popupText: /We will ask you to specify .* trips.The order of the interviewed persons was randomly selected.Continue/
            });
        }

        // Test custom widget personWhoWillAnswerForThisPerson
        if (householdSize >= 2) {
            testHelpers.inputRadioTest({
                context,
                path: 'household.persons.${activePersonId}.journeys.${activeJourneyId}.whoWillAnswerForThisPerson',
                value: '${activePersonId}' // Select the current person
            });
        }

        // Test custom widget personDidTrips
        testHelpers.inputRadioTest({
            context,
            path: 'household.persons.${activePersonId}.journeys.${activeJourneyId}.personDidTrips',
            value: 'no'
        });

        // TODO: Test custom widget personDidTripsChangeConfirm
        // Implement custom test

        // TODO: Test custom widget visitedPlacesIntro
        // Implement custom test

        // TODO: Test custom widget personDeparturePlaceIsHome
        // Implement custom test

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
            text: 'Your answers will be used to assess the use and traffic of the road and public transit networks and will remain entirely confidential.'
        });

        // Test nextbutton widget tripsIntro_save
        if (householdSize === index + 1) {
            // If it's the last person in the household, go to the end page
            testHelpers.inputNextButtonTest({ context, text: 'Continue', nextPageUrl: '/survey/end' });
        } else {
            // If there are still persons in the household, continue the trips intro section
            testHelpers.inputNextButtonTest({ context, text: 'Continue', nextPageUrl: '/survey/tripsIntro' });
        }
    });

    // Verify the tripsIntro navigation is completed
    testHelpers.verifyNavBarButtonStatus({
        context,
        buttonText: 'trips',
        buttonStatus: 'completed',
        isDisabled: false
    });
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
    testHelpers.inputRadioTest({ context, path: 'wouldLikeToParticipateInOtherSurveysChaireMobilite', value: 'yes' });

    // Test string widget wouldLikeToParticipateInOtherSurveysChaireMobiliteContactEmail with conditional wantToParticipateInOtherSurveysChaireMobiliteConditional
    /* @link file://./../src/survey/common/conditionals.tsx */
    testHelpers.inputStringTest({
        context,
        path: 'wouldLikeToParticipateInOtherSurveysChaireMobiliteContactEmail',
        value: 'test@example.com'
    });

    // Test text widget householdCommentsOnSurvey
    testHelpers.inputStringTest({ context, path: 'commentsOnSurvey', value: 'Test' });

    // Test infotext widget optionalIntroText
    testHelpers.waitTextVisible({
        context,
        text: 'The next questions are optional and are added for research purposes. You can complete the interview without answering them.'
    });

    // Test radionumber widget householdHybridCarNumber with conditional householdHasCars
    /* @link file://./../src/survey/common/conditionals.tsx */
    testHelpers.inputRadioTest({ context, path: 'household.hybridCarNumber', value: '1' });

    // Test radionumber widget householdElectricCarNumber with conditional householdHasCars
    /* @link file://./../src/survey/common/conditionals.tsx */
    testHelpers.inputRadioTest({ context, path: 'household.electricCarNumber', value: '1' });

    // Test range widget endDurationOfTheSurvey
    testHelpers.inputRangeTest({ context, path: 'durationOfSurvey', value: 70, sliderColor: 'blue' });

    // Test number widget endTimeSpentAnswering
    testHelpers.inputStringTest({ context, path: 'timeSpentAnswering', value: '15' });

    // Test range widget endInterestOfTheSurvey
    testHelpers.inputRangeTest({ context, path: 'interestOfTheSurvey', value: 75, sliderColor: 'red-yellow-green' });

    // Test range widget endDifficultyOfTheSurvey
    testHelpers.inputRangeTest({ context, path: 'difficultyOfTheSurvey', value: 40, sliderColor: 'green-yellow-red' });

    // Test range widget endBurdenOfTheSurvey
    testHelpers.inputRangeTest({ context, path: 'burdenOfTheSurvey', value: 30, sliderColor: 'green-yellow-red' });

    // Test radio widget endConsideredAbandoningSurvey with choices yesNoDontKnow
    /* @link file://./../src/survey/common/choices.tsx */
    testHelpers.inputRadioTest({ context, path: 'consideredAbandoningSurvey', value: 'no' });

    // Test nextbutton widget buttonCompleteInterviewWithCompleteSection
    testHelpers.inputNextButtonTest({ context, text: 'Complete the interview', nextPageUrl: '/survey/completed' });

    // Verify the end navigation is completed
    testHelpers.verifyNavBarButtonStatus({ context, buttonText: 'end', buttonStatus: 'activeAndCompleted', isDisabled: false });
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
