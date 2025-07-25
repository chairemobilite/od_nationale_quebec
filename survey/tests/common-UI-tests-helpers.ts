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

// Generate a random access code in the format 0123-4567
export const generateRandomAccessCode = () => `${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`;

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
