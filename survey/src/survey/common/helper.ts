import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import config from 'evolution-common/lib/config/project.config';
import { UserInterviewAttributes } from 'evolution-common/lib/services/questionnaire/types';
import { getResponse } from 'evolution-common/lib/utils/helpers';
import * as odSurveyHelper from 'evolution-common/lib/services/odSurvey/helpers';

/**
 * TODO Move to Evolution as an 8DigitsAccessCodeFormatter
 * @param input The input to format
 * @returns The formatted access code
 */
export const formatAccessCode = (input: string) => {
    input = input.replaceAll('_', '-'); // change _ to -
    input = input.replace(/[^-\d]/g, ''); // Remove everything but numbers and -
    // Get only the digits
    const digits = input.replace(/\D+/g, '');

    // If we have at least 8 digits, format the first 8 as access code
    if (digits.length >= 8) {
        return digits.slice(0, 4) + '-' + digits.slice(4, 8);
    }

    // For less than 8 digits, return as is (already cleaned of non-allowed chars)
    return input.slice(0, 9);
};

/**
 * Return the address as a one line string, including all the parts
 *
 * TODO Move to evolution
 * TODO2 Type the object here
 *
 * @param obj The object from which to extract address parts
 */
const getAddressOneLine = (obj, includeRegion = false, includeCountry = false, includePostalCode = false): string => {
    if (!obj) {
        return '';
    }
    const civicNumberAndStreetName = obj.address as string | undefined;
    const city = obj.city as string | undefined;
    const region = obj.region as string | undefined;
    const country = obj.country as string | undefined;
    const postalCode = obj.postalCode as string | undefined;
    return !_isBlank(civicNumberAndStreetName) && !_isBlank(city)
        ? `${civicNumberAndStreetName}, ${city[0].toUpperCase() + city.substring(1)}${
            includeRegion && region ? `, ${region} ` : ''
        }${includeCountry && country ? `, ${country}` : ''}${
            includePostalCode && postalCode ? ' ' + postalCode.toUpperCase() : ''
        }`
        : '';
};

/**
 * Return the home address as a one line string, including all the parts
 *
 * TODO Move to evolution
 *
 * @param interview The interview
 */
export const getHomeAddressOneLine = (
    interview: UserInterviewAttributes,
    includeRegion = false,
    includeCountry = false,
    includePostalCode = false
): string => {
    const homeObj = getResponse(interview, 'home', undefined);
    return getAddressOneLine(homeObj, includeRegion, includeCountry, includePostalCode);
};

/**
 * Return whether the home section should be considered as completed
 *
 * TODO Parameterize the fields and conditions to check for the section in
 * Evolution instead of requiring this function
 *
 * @param interview
 * @returns
 */
export const homeSectionComplete = (interview: UserInterviewAttributes): boolean => {
    const household = odSurveyHelper.getHousehold({ interview });
    const homeGeometry = getResponse(interview, 'home.geography.geometry.coordinates');
    return !(
        _isBlank(household) ||
        _isBlank(household.size) ||
        _isBlank(household.carNumber) ||
        _isBlank(homeGeometry)
    );
};

/**
 * Return whether the household members section should be considered as completed
 *
 * TODO Parameterize the fields and conditions to check for the section in
 * Evolution instead of requiring this function
 * @param interview
 * @returns
 */
export const householdMembersSectionComplete = (interview: UserInterviewAttributes): boolean => {
    if (!homeSectionComplete(interview)) {
        return false;
    }
    const household = odSurveyHelper.getHousehold({ interview });
    const personCount = odSurveyHelper.countPersons({ interview });
    if (household.size !== personCount) {
        return false;
    }
    const persons = odSurveyHelper.getPersonsArray({ interview });
    return persons.every((person) => basicInfoForPersonComplete(person, household.size));
};

// TODO Parameterize the fields and conditions to check for the section in
// Evolution instead of requiring this function
const basicInfoForPersonComplete = function (person, householdSize) {
    return !(
        _isBlank(person) ||
        _isBlank(person.age) ||
        (_isBlank(person.gender) && person.age >= 5) ||
        (householdSize > 1 && _isBlank(person.nickname)) ||
        (_isBlank(person.drivingLicenseOwner) && person.age >= config.drivingLicenseAge)
    );
};

/**
 * TODO Parameterize the fields and conditions to check for the section in
 * Evolution instead of requiring this function
 * @param person
 * @param interview
 * @returns
 */
export const tripsIntroForPersonComplete = (person, interview: UserInterviewAttributes) => {
    if (person && typeof person.age === 'number' && person.age < 5) {
        return true;
    }
    const journeys = odSurveyHelper.getJourneysArray({ person });
    if (journeys.length === 0) {
        return false;
    }
    const firstJourney = journeys[0];
    return (
        !_isBlank((firstJourney as any).personDidTrips) &&
        ((firstJourney as any).personDidTrips === 'no' || !_isBlank((firstJourney as any).departurePlaceIsHome))
    );
};

/**
 * TODO Parameterize the fields and conditions to check for the section in
 * Evolution instead of requiring this function
 * @param person
 * @param interview
 * @returns
 */
export const tripDiaryAndTravelBehaviorForPersonComplete = function (person, interview: UserInterviewAttributes) {
    // FIXME Add conditions as sections are added
    return tripsIntroForPersonComplete(person, interview);
};

/**
 * TODO Parameterize the fields and conditions to check for the section in
 * Evolution instead of requiring this function
 * @param interview
 * @returns
 */
export const allPersonsTripDiariesCompleted = function (interview: UserInterviewAttributes) {
    const interviewablePersons = odSurveyHelper.getInterviewablePersonsArray({ interview });
    return interviewablePersons.every((person) => tripDiaryAndTravelBehaviorForPersonComplete(person, interview));
};
