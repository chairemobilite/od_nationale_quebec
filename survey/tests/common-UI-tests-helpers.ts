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

// Modify the CommonTestParameters type with survey parameters
export type CommonTestParametersModify = testHelpers.CommonTestParameters & {
    householdSize?: number;
};

// Generate a random access code in the format 0123-4567 from 0000-0000 to 9999-9999
export const generateRandomAccessCode = () =>
    `${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;

/********** Tests home section **********/
export const fillHomeSectionTests = ({ context, householdSize = 1 }: CommonTestParametersModify) => {
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

    // Test string widget personNickname with conditional hasHouseholdSize2OrMoreConditional
    /* @link file://./../src/survey/common/conditionals.tsx */
    if (householdSize === 1) {
        testHelpers.inputVisibleTest({ context, path: 'household.persons.${personId[0]}.nickname', isVisible: false });
    } else {
        testHelpers.inputStringTest({ context, path: 'household.persons.${personId[0]}.nickname', value: 'Martha' });
    }

    // Test number widget personAge
    testHelpers.inputStringTest({ context, path: 'household.persons.${personId[0]}.age', value: '30' });

    // Test radio widget personGender with conditional ifAge5orMoreConditional with choices gender
    /* @link file://./../src/survey/common/conditionals.tsx */
    /* @link file://./../src/survey/common/choices.tsx */
    testHelpers.inputRadioTest({ context, path: 'household.persons.${personId[0]}.gender', value: 'female' });

    // Test radio widget personWorkerType with conditional ifAge14orMoreConditional with choices participationStatus
    /* @link file://./../src/survey/common/conditionals.tsx */
    /* @link file://./../src/survey/common/choices.tsx */
    testHelpers.inputRadioTest({ context, path: 'household.persons.${personId[0]}.workerType', value: 'fullTime' });

    // Test radio widget personStudentType with conditional ifAge16OrMoreConditional with choices participationStatus
    /* @link file://./../src/survey/common/conditionals.tsx */
    /* @link file://./../src/survey/common/choices.tsx */
    testHelpers.inputRadioTest({ context, path: 'household.persons.${personId[0]}.studentType', value: 'partTime' });

    // Test radio widget personSchoolType with conditional ifAge15OrLessConditional with choices schoolType
    /* @link file://./../src/survey/common/conditionals.tsx */
    /* @link file://./../src/survey/common/choices.tsx */
    testHelpers.inputVisibleTest({ context, path: 'household.persons.${personId[0]}.schoolType', isVisible: false });

    // Test radio widget personOccupation with conditional personOccupationCustomConditional with choices personOccupation
    /* @link file://./../src/survey/common/conditionals.tsx */
    /* @link file://./../src/survey/common/choices.tsx */
    testHelpers.inputVisibleTest({ context, path: 'household.persons.${personId[0]}.occupation', isVisible: false });

    // Test radio widget personDrivingLicenseOwnership with conditional ifAge16OrMoreConditional with choices yesNoDontKnow
    /* @link file://./../src/survey/common/conditionals.tsx */
    /* @link file://./../src/survey/common/choices.tsx */
    testHelpers.inputRadioTest({
        context,
        path: 'household.persons.${personId[0]}.drivingLicenseOwnership',
        value: 'yes'
    });

    // Test radio widget personCarSharingMember with conditional hasDrivingLicenseConditional with choices yesNoDontKnow
    /* @link file://./../src/survey/common/conditionals.tsx */
    /* @link file://./../src/survey/common/choices.tsx */
    testHelpers.inputRadioTest({ context, path: 'household.persons.${personId[0]}.carSharingMember', value: 'yes' });

    // Test checkbox widget personTransitFares with conditional ifAge6OrMoreConditional with choices transitFareType
    /* @link file://./../src/survey/common/conditionals.tsx */
    /* @link file://./../src/survey/common/choices.tsx */
    testHelpers.inputCheckboxTest({
        context,
        path: 'household.persons.${personId[0]}.transitFares',
        values: ['transitPass']
    });

    // Test radio widget personHasDisability with conditional hasOnePersonWithDisabilityOrHhSize1Conditional with choices yesNoPreferNotToAnswer
    /* @link file://./../src/survey/common/conditionals.tsx */
    /* @link file://./../src/survey/common/choices.tsx */
    if (householdSize === 1) {
        testHelpers.inputRadioTest({ context, path: 'household.persons.${personId[0]}.hasDisability', value: 'no' });
    } else {
        testHelpers.inputVisibleTest({
            context,
            path: 'household.persons.${personId[0]}.hasDisability',
            isVisible: false
        });
    }

    // Test radio widget personWorkPlaceType with conditional isWorkerConditional with choices workPlaceTypeChoices
    /* @link file://./../src/survey/common/conditionals.tsx */
    /* @link file://./../src/survey/common/choices.tsx */
    testHelpers.inputRadioTest({ context, path: 'household.persons.${personId[0]}.workPlaceType', value: 'hybrid' });

    // Test radio widget personSchoolPlaceType with conditional isStudentConditional with choices schoolPlaceTypeChoices
    /* @link file://./../src/survey/common/conditionals.tsx */
    /* @link file://./../src/survey/common/choices.tsx */
    testHelpers.inputRadioTest({ context, path: 'household.persons.${personId[0]}.schoolPlaceType', value: 'hybrid' });

    // Test string widget personUsualWorkPlaceName with conditional hasWorkingLocationConditional
    /* @link file://./../src/survey/common/conditionals.tsx */
    testHelpers.inputStringTest({
        context,
        path: 'household.persons.${personId[0]}.usualWorkPlace.name',
        value: 'Bombardier'
    });

    // Test custom widget personUsualWorkPlaceGeography with conditional hasWorkingLocationConditional
    /* @link file://./../src/survey/common/conditionals.tsx */
    testHelpers.inputMapFindPlaceTest({
        context,
        path: 'household.persons.${personId[0]}.usualWorkPlace.geography'
    });

    // Test string widget personUsualSchoolPlaceName with conditional personUsualSchoolPlaceNameCustomConditional
    /* @link file://./../src/survey/common/conditionals.tsx */
    testHelpers.inputStringTest({
        context,
        path: 'household.persons.${personId[0]}.usualSchoolPlace.name',
        value: 'Université de Montréal, Campus de la Montagne'
    });

    // Test custom widget personUsualSchoolPlaceGeography
    testHelpers.inputMapFindPlaceTest({
        context,
        path: 'household.persons.${personId[0]}.usualSchoolPlace.geography'
    });

    // Test checkbox widget personTravelToWorkDays with conditional personTravelToWorkDaysConditional with choices lastWeekTravelToWorkDaysCustomChoices
    /* @link file://./../src/survey/common/conditionals.tsx */
    /* @link file://./../src/survey/common/choices.tsx */
    testHelpers.inputCheckboxTest({
        context,
        path: 'household.persons.${personId[0]}.travelToWorkDays',
        values: ['no']
    });

    // Test checkbox widget personRemoteWorkDays with conditional personRemoteWorkDaysConditional with choices lastWeekRemoteWorkDaysCustomChoices
    /* @link file://./../src/survey/common/conditionals.tsx */
    /* @link file://./../src/survey/common/choices.tsx */
    testHelpers.inputCheckboxTest({ context, path: 'household.persons.${personId[0]}.remoteWorkDays', values: ['no'] });

    // Test checkbox widget personTravelToStudyDays with conditional personTravelToStudyDaysConditional with choices lastWeekTravelToStudyDaysCustomChoices
    /* @link file://./../src/survey/common/conditionals.tsx */
    /* @link file://./../src/survey/common/choices.tsx */
    testHelpers.inputCheckboxTest({
        context,
        path: 'household.persons.${personId[0]}.travelToStudyDays',
        values: ['no']
    });

    // Test checkbox widget personRemoteStudyDays with conditional personRemoteStudyDaysConditional with choices lastWeekRemoteStudyDaysCustomChoices
    /* @link file://./../src/survey/common/conditionals.tsx */
    /* @link file://./../src/survey/common/choices.tsx */
    testHelpers.inputCheckboxTest({
        context,
        path: 'household.persons.${personId[0]}.remoteStudyDays',
        values: ['no']
    });

    // Test nextbutton widget household_save
    testHelpers.inputNextButtonTest({ context, text: 'Save and continue', nextPageUrl: '/survey/tripsIntro' });

    // Verify the household navigation is completed
    testHelpers.verifyNavBarButtonStatus({
        context,
        buttonText: 'household',
        buttonStatus: 'completed',
        isDisabled: false
    });
};

/********** Tests tripsIntro section **********/
export const fillTripsintroSectionTests = ({ context, householdSize = 1 }: CommonTestParametersModify) => {
    // Verify the tripsIntro navigation is active
    testHelpers.verifyNavBarButtonStatus({
        context,
        buttonText: 'trips',
        buttonStatus: 'active',
        isDisabled: false
    });

    // Test custom widget activePersonTitle with conditional hasHouseholdSize2OrMoreConditional
    /* @link file://./../src/survey/common/conditionals.tsx */
    testHelpers.inputVisibleTest({ context, path: 'activePersonTitle', isVisible: false });
    // Implement custom test

    // TODO: Test custom widget buttonSwitchPerson
    // Implement custom test

    // TODO: Test custom widget personNewPerson
    // Implement custom test

    // TODO: Test custom widget personWhoWillAnswerForThisPerson
    // Implement custom test

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
    testHelpers.inputNextButtonTest({ context, text: 'Continue', nextPageUrl: '/survey/end' });

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
    testHelpers.verifyNavBarButtonStatus({ context, buttonText: 'end', buttonStatus: 'completed', isDisabled: false });
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
