import _get from 'lodash/get';
import _isEqual from 'lodash/isEqual';
import { distance as turfDistance } from '@turf/turf';
import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import config from 'evolution-common/lib/config/project.config';
import {
    Person,
    StartRemoveGroupedObjects,
    StartUpdateInterview,
    UserInterviewAttributes,
    VisitedPlace
} from 'evolution-common/lib/services/questionnaire/types';
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
 * @returns journey
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

/**
 * Select the next incomplete visited place
 * TODO Parameterize the fields and conditions to check for the section in
 * Evolution instead of requiring this function
 * @param interview
 * @returns
 */
export const selectNextIncompleteVisitedPlace = ({
    interview,
    visitedPlaces,
    person
}: {
    interview: UserInterviewAttributes;
    visitedPlaces: VisitedPlace[];
    person: Person;
}): VisitedPlace | null => {
    const count = visitedPlaces.length;
    const lastVisitedlaces = visitedPlaces[visitedPlaces.length - 1];
    const lastSequence = lastVisitedlaces ? lastVisitedlaces._sequence : null;
    for (let i = 0; i < count; i++) {
        const visitedPlace = visitedPlaces[i];
        const nextVisitedPlace = visitedPlaces[i + 1];
        const geography = odSurveyHelper.getVisitedPlaceGeography({ visitedPlace, interview, person });

        if (
            _isBlank(visitedPlace.activityCategory) ||
            _isBlank(visitedPlace.activity) ||
            (visitedPlace._sequence === lastSequence &&
                (visitedPlace as any).nextPlaceCategory !== 'stayedThereUntilTheNextDay') ||
            (_isBlank(visitedPlace.arrivalTime) && visitedPlace._sequence > 1) ||
            (_isBlank((visitedPlace as any).nextPlaceCategory) && !nextVisitedPlace) ||
            (_isBlank(geography) && !['workOnTheRoad', 'leisureStroll'].includes(visitedPlace.activity))
        ) {
            return visitedPlace;
        }
    }
    return null;
};

const isSchoolEnrolledTrueValues = [
    'kindergarten',
    'childcare',
    'primarySchool',
    'secondarySchool',
    'schoolAtHome',
    'other'
];

/**
 * Whether the person is enrolled in school
 * TODO Parameterize the fields and conditions to check for the section in
 * Evolution instead of requiring this function
 * @param person
 * @returns
 */
export const isStudentFromEnrolled = (person: Person) => {
    const schoolType = person.schoolType;
    return !_isBlank(schoolType) && isSchoolEnrolledTrueValues.includes(schoolType);
};

/**
 * Whether the person is a student
 * TODO Parameterize the fields and conditions to check for the section in
 * Evolution instead of requiring this function
 * @param person
 * @returns
 */
export const isStudent = (person: Person) => {
    if (_isBlank(person)) {
        return false;
    }
    return ['fullTimeStudent', 'partTimeStudent', 'workerAndStudent'].includes(person.occupation);
};

/**
 * Get the number of car sharing members in the household
 * TODO Parameterize the fields and conditions to check for the section in
 * Evolution instead of requiring this function
 * @param interview
 * @returns
 */
export const carsharingMembersCountInHousehold = (interview: UserInterviewAttributes) => {
    const carSharingMembers = odSurveyHelper
        .getPersonsArray({ interview })
        .filter((person) => (person as any).carSharingMember === 'yes');
    return carSharingMembers.length;
};

//TODO: add attributePrefix for custom named visitedPlaces:
export const getHouseholdVisitedAndUsualPlacesArrayAndByPersonId = function (interview) {
    const persons = odSurveyHelper.getPersonsArray({ interview });
    const visitedPlaces = [];
    const visitedPlacesByPersonId = {};
    const usualPlaces = [];
    const usualPlacesByPersonId = {};
    for (const person of persons) {
        const personJourney = odSurveyHelper.getJourneysArray({ person })[0];
        if (_isBlank(personJourney)) {
            continue; // Skip persons without journeys
        }
        const personVisitedPlacesArray = odSurveyHelper.getVisitedPlacesArray({ journey: personJourney });
        visitedPlaces.push(...personVisitedPlacesArray);
        visitedPlacesByPersonId[person._uuid] = personVisitedPlacesArray;

        // Get the person's usual places
        const personUsualPlaces = [];
        usualPlacesByPersonId[person._uuid] = personUsualPlaces;
        if ((person as any).usualWorkPlace) {
            personUsualPlaces.push((person as any).usualWorkPlace);
        }
        if ((person as any).usualSchoolPlace) {
            personUsualPlaces.push((person as any).usualSchoolPlace);
        }
        usualPlaces.push(...personUsualPlaces);
        usualPlacesByPersonId[person._uuid] = personUsualPlaces;
    }
    return {
        visitedPlaces,
        visitedPlacesByPersonId,
        usualPlaces,
        usualPlacesByPersonId
    };
};

export const getShortcutVisitedPlacePerson = function (shortcutVisitedPlaceId, interview) {
    if (!shortcutVisitedPlaceId) {
        return null;
    }
    const visitedAndUsualPlacesArrayAndByPersonId = getHouseholdVisitedAndUsualPlacesArrayAndByPersonId(interview);
    for (const personId in visitedAndUsualPlacesArrayAndByPersonId.visitedPlacesByPersonId) {
        const personVisitedPlaces = visitedAndUsualPlacesArrayAndByPersonId.visitedPlacesByPersonId[personId];
        for (let i = 0, count = personVisitedPlaces.length; i < count; i++) {
            const visitedPlace = personVisitedPlaces[i];
            if (visitedPlace && visitedPlace._uuid === shortcutVisitedPlaceId) {
                return odSurveyHelper.getPerson({ interview, personId });
            }
        }
    }
    // It may be one of the usual places
    for (const personId in visitedAndUsualPlacesArrayAndByPersonId.usualPlacesByPersonId) {
        const personVisitedPlaces = visitedAndUsualPlacesArrayAndByPersonId.usualPlacesByPersonId[personId];
        for (let i = 0, count = personVisitedPlaces.length; i < count; i++) {
            const visitedPlace = personVisitedPlaces[i];
            if (visitedPlace && visitedPlace._uuid === shortcutVisitedPlaceId) {
                return odSurveyHelper.getPerson({ interview, personId });
            }
        }
    }
    return null;
};

export const getShortcutVisitedPlaceName = function (shortcutVisitedPlace, interview) {
    if (!shortcutVisitedPlace) {
        return null;
    }
    if (shortcutVisitedPlace.name) {
        return shortcutVisitedPlace.name;
    } else if (shortcutVisitedPlace.activity === 'home') {
        return null;
    } else if (shortcutVisitedPlace.activity === 'workUsual') {
        const person: any = getShortcutVisitedPlacePerson(shortcutVisitedPlace._uuid, interview);
        return person.usualWorkPlaceName || null;
    } else if (shortcutVisitedPlace.activity === 'schoolUsual') {
        const person: any = getShortcutVisitedPlacePerson(shortcutVisitedPlace._uuid, interview);
        return person.usualSchoolPlaceName || null;
    }
    return null;
};

const getDurationWithHourFromSeconds = function (durationSeconds) {
    if (_isBlank(durationSeconds) || isNaN(Number(durationSeconds))) {
        return {
            hour: null,
            minute: null
        };
    }
    const hour = Math.floor(durationSeconds / 3600);
    const minute = Math.round(durationSeconds / 60) - hour * 60;
    return {
        hour,
        minute
    };
};

/**
 * Formats a trip duration as a presentable and localized string
 *
 * TODO Bring to evolution
 *
 * @param {number} startTime trip start time: number of seconds since midnight
 * @param {number} endTime trip end time: number of seconds since midnight
 * @param {string} language localization language: either 'fr' or 'en'.
 *
 * @return {string} the formatted trip duration. Ex: <span class="_pale _oblique">(déplacement de 2 heures 5 minutes)</span>
 */
export const formatTripDuration = function (startTime, endTime, language) {
    if (_isBlank(startTime) || _isBlank(endTime)) {
        return '';
    }

    const travelTimeSeconds = startTime - endTime;
    const travelTimeHourAndMinute = getDurationWithHourFromSeconds(travelTimeSeconds);
    if (!_isBlank(travelTimeHourAndMinute)) {
        const hour = travelTimeHourAndMinute.hour;
        const minute = travelTimeHourAndMinute.minute;

        // TODO: Do this localization with the i18n system properly. For now... flemme
        if (language === 'fr') {
            const travelTimeStr = travelTimeHourAndMinute
                ? `${hour > 0 ? ` ${hour} heure${hour >= 2 ? 's' : ''}` : ''}${
                    hour === 0 && minute === 0 ? ' moins de 5 minutes' : minute > 0 ? ` ${minute} minutes` : ''
                }`
                : '';
            return `<br /><span class="_pale _oblique">(déplacement de${travelTimeStr})</span>`;
        } else {
            const travelTimeStr = travelTimeHourAndMinute
                ? `${hour > 0 ? `${hour} h` : ''}${
                    hour === 0 && minute === 0
                        ? 'less than 5 min'
                        : minute > 0
                            ? `${hour > 0 ? ' ' : ''}${minute} min`
                            : ''
                }`
                : '';
            return `<br /><span class="_pale _oblique">(${travelTimeStr} trip)</span>`;
        }
    }
};

const updateVisitedPlaces = function (person, journey, visitedPlaces, includeSelectedVisitedPlaceId = true) {
    const count = visitedPlaces.length;
    const updateValuesByPath = {};
    for (let i = 0; i < count; i++) {
        const visitedPlace = visitedPlaces[i];
        const visitedPlacePath = `household.persons.${person._uuid}.journeys.${journey._uuid}.visitedPlaces.${visitedPlace._uuid}`;
        const nextVisitedPlace = i + 1 < count ? visitedPlaces[i + 1] : null;
        if (
            nextVisitedPlace &&
            nextVisitedPlace.activity === 'home' &&
            visitedPlace.nextPlaceCategory !== 'wentBackHome'
        ) {
            updateValuesByPath[`response.${visitedPlacePath}.nextPlaceCategory`] = 'wentBackHome';
        }
        if (
            nextVisitedPlace &&
            nextVisitedPlace.activity !== 'home' &&
            visitedPlace.nextPlaceCategory === 'wentBackHome'
        ) {
            updateValuesByPath[`response.${visitedPlacePath}.nextPlaceCategory`] = 'visitedAnotherPlace';
        }
        if (
            !nextVisitedPlace &&
            !_isBlank(visitedPlace.nextPlaceCategory) &&
            visitedPlace.nextPlaceCategory !== 'stayedThereUntilTheNextDay'
        ) {
            // we need to nullify path for the previous visited place:
            updateValuesByPath[`response.${visitedPlacePath}.nextPlaceCategory`] = null;
        }
        if (i === 0 && !_isBlank(visitedPlace.arrivalTime)) {
            updateValuesByPath[`response.${visitedPlacePath}.arrivalTime`] = null;
        }
        if (
            visitedPlace.nextPlaceCategory === 'stayedThereUntilTheNextDay' &&
            i === count - 1 &&
            !_isBlank(visitedPlace.departureTime)
        ) {
            updateValuesByPath[`response.${visitedPlacePath}.departureTime`] = null;
        }
        if (includeSelectedVisitedPlaceId) {
            updateValuesByPath['response._activeVisitedPlaceId'] = selectNextIncompleteVisitedPlace(visitedPlaces);
        }
        return updateValuesByPath;
    }
};

/**
 * TODO Move to Evolution, this was copy pasted from there anyway
 * @param visitedPlacePath
 * @param interview
 * @param startRemoveGroupedObjects
 * @param startUpdateInterview
 * @returns
 */
export const deleteVisitedPlace = (
    visitedPlacePath: string,
    interview: UserInterviewAttributes,
    startRemoveGroupedObjects: StartRemoveGroupedObjects,
    startUpdateInterview: StartUpdateInterview
) => {
    const person = odSurveyHelper.getPerson({ interview });
    const journey = odSurveyHelper.getActiveJourney({ interview });
    if (!journey) {
        return;
    }
    const visitedPlacePathsToDelete = [visitedPlacePath];
    const visitedPlace = getResponse(interview, visitedPlacePath, null) as VisitedPlace;
    const previousVisitedPlace = odSurveyHelper.getPreviousVisitedPlace({
        visitedPlaceId: visitedPlace._uuid,
        journey
    });
    const nextVisitedPlace = odSurveyHelper.getNextVisitedPlace({ visitedPlaceId: visitedPlace._uuid, journey });
    if (
        nextVisitedPlace &&
        nextVisitedPlace.activity === 'home' &&
        previousVisitedPlace &&
        previousVisitedPlace.activity === 'home'
    ) {
        const nextVisitedPlacePath = `household.persons.${person._uuid}.journeys.${journey._uuid}.visitedPlaces.${nextVisitedPlace._uuid}`;
        visitedPlacePathsToDelete.push(nextVisitedPlacePath);
    }
    // Before deleting, replace the location shortcuts by original data, the will be updated after group removal
    const updatedValues = visitedPlacePathsToDelete
        .map((placePath) => odSurveyHelper.replaceVisitedPlaceShortcuts({ interview, shortcutTo: placePath }))
        .filter((updatedPaths) => updatedPaths !== undefined)
        .reduce(
            (previous, current) => ({
                updatedValuesByPath: Object.assign(previous.updatedValuesByPath, current.updatedValuesByPath),
                unsetPaths: [...previous.unsetPaths, ...current.unsetPaths]
            }),
            { updatedValuesByPath: {}, unsetPaths: [] }
        );

    startRemoveGroupedObjects(visitedPlacePathsToDelete, (updatedInterview) => {
        const person = odSurveyHelper.getPerson({ interview: updatedInterview });
        const journey = odSurveyHelper.getActiveJourney({ interview: updatedInterview, person });
        const visitedPlaces = odSurveyHelper.getVisitedPlaces({ journey });
        const updateValuesByPath = updateVisitedPlaces(person, journey, visitedPlaces, true);
        startUpdateInterview({
            sectionShortname: 'visitedPlaces',
            valuesByPath: Object.assign(updatedValues.updatedValuesByPath, updateValuesByPath),
            unsetPaths: updatedValues.unsetPaths
        });
    });
};

/**
 * Get the distance in meters between the origin and destination of a trip
 * TODO Move to Evolution
 */
export const getBirdDistanceMeters = function ({ trip, visitedPlaces, person, interview }) {
    const origin = odSurveyHelper.getOrigin({ trip, visitedPlaces });
    const destination = odSurveyHelper.getDestination({ trip, visitedPlaces });
    if (_isBlank(origin) || _isBlank(destination)) {
        return null;
    }
    const originGeography = odSurveyHelper.getVisitedPlaceGeography({ visitedPlace: origin, interview, person });
    const destinationGeography = odSurveyHelper.getVisitedPlaceGeography({
        visitedPlace: destination,
        interview,
        person
    });
    if (_isBlank(originGeography) || _isBlank(destinationGeography)) {
        return null;
    }
    return turfDistance(originGeography.geometry, destinationGeography.geometry, {
        units: 'meters'
    });
};

export const getCurrentTripBirdDistanceMeters = ({ interview }) => {
    const person = odSurveyHelper.getActivePerson({ interview });
    const journey = odSurveyHelper.getActiveJourney({ interview });
    const visitedPlaces = odSurveyHelper.getVisitedPlaces({ journey });
    const trip = odSurveyHelper.getActiveTrip({ interview, journey });
    return getBirdDistanceMeters({ trip, visitedPlaces, person, interview });
};

/**
 * TODO Move to Evolution
 */
export const getDrivers = ({ interview }): any => {
    const persons = odSurveyHelper.getPersonsArray({ interview });
    return persons.filter((person) => (person as any).drivingLicenseOwner === 'yes');
};

/**
 * TODO Move to Evolution
 * TODO Parameterize the modes here, this function is copy-pasted as is from 2024
 */
export const shouldDisplayTripJunction = (previousSegment, currentSegment, activity) => {
    //tripJunction needed when changing from private to public modes (private modes: car driver, car passenger, moto, taxi - walking is excluded )
    if (
        !_isBlank(previousSegment) &&
        (['carDriver', 'carPassenger', 'bicycle', 'taxi', 'train', 'paratransit'].includes(previousSegment.modePre) ||
            [
                'taxi',
                'ferryWithCar',
                'motorcycle',
                'bicycle',
                'bicycleElectric',
                'scooterElectric',
                'plane',
                'other'
            ].includes(previousSegment.mode)) &&
        (currentSegment.modePre === 'transit' ||
            ['ferryNoCar', 'ferryNoCar', 'train', 'intercityBus', 'taxi'].includes(currentSegment.mode))
    ) {
        return activity !== 'workOnTheRoad';
    }
    if (
        !_isBlank(previousSegment) &&
        (['carDriver', 'carPassenger', 'bicycle', 'taxi', 'train', 'paratransit'].includes(currentSegment.modePre) ||
            [
                'taxi',
                'ferryWithCar',
                'motorcycle',
                'bicycle',
                'bicycleElectric',
                'scooterElectric',
                'plane',
                'other'
            ].includes(currentSegment.mode)) &&
        (previousSegment.modePre === 'transit' ||
            ['transitBus', 'ferryNoCar', 'train', 'intercityBus', 'taxi'].includes(previousSegment.mode))
    ) {
        return activity !== 'workOnTheRoad';
    }
    return false;
};
