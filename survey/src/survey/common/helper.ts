import _get from 'lodash/get';
import _isEqual from 'lodash/isEqual';
import moment from 'moment-business-days';
import { distance as turfDistance } from '@turf/turf';
import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import config from 'evolution-common/lib/config/project.config';
import {
    Journey,
    Person,
    StartRemoveGroupedObjects,
    StartUpdateInterview,
    UserInterviewAttributes,
    VisitedPlace
} from 'evolution-common/lib/services/questionnaire/types';
import { getResponse } from 'evolution-common/lib/utils/helpers';
import * as odSurveyHelper from 'evolution-common/lib/services/odSurvey/helpers';

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
 * Return whether the household members section should be considered as
 * completed
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
    // FIXME If household size is less than person count, that's ok, we have
    // manually decremented, the participant should have gone to fix it in the
    // household section, if he did not and went directly to the trips (because
    // he already entered data further in the interview), we keep it as is. The
    // check used to be with !== but that prevent from completing the household
    // section when a member was manually added. Return to !==  when
    // https://github.com/chairemobilite/evolution/issues/1132 is fixed
    if (household.size > personCount) {
        return false;
    }
    const persons = odSurveyHelper.getPersonsArray({ interview });
    return persons.every((person) => basicInfoForPersonComplete(person, household.size));
};

// TODO Parameterize the fields and conditions to check for the section in
// Evolution instead of requiring this function
const basicInfoForPersonComplete = function (person: Person, householdSize) {
    return !(
        _isBlank(person) ||
        _isBlank(person.age) ||
        (_isBlank(person.sexAssignedAtBirth) && _isBlank(person.gender) && person.age >= 5) ||
        (householdSize > 1 && _isBlank(person.nickname)) ||
        (_isBlank(person.drivingLicenseOwnership) && person.age >= config.drivingLicenseAge)
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

export const tripsForPersonComplete = function ({
    person,
    interview
}: {
    person: Person;
    interview: UserInterviewAttributes;
}) {
    const journey = odSurveyHelper.getJourneysArray({ person })[0];
    // Complete if the person did not do any trips
    if (!_isBlank((journey as any).personDidTrips) && (journey as any).personDidTrips !== 'yes') {
        return true;
    }
    // Complete if there is no next trip or visited place to edit
    const visitedPlaces = odSurveyHelper.getVisitedPlacesArray({ journey });
    const nextPlace = selectNextIncompleteVisitedPlace({ interview, visitedPlaces, person });
    const nextTrip = odSurveyHelper.selectNextIncompleteTrip({ journey });
    return nextTrip === null && nextPlace === null;
};

const getVisitedPlacesForCategory = (journey: Journey, activityCategory: string) => {
    const visitedPlaces = odSurveyHelper.getVisitedPlacesArray({ journey });
    return visitedPlaces.filter((visitedPlace) => visitedPlace.activityCategory === activityCategory);
};

export const shouldAskForNoWorkTripReason = ({
    person,
    interview
}: {
    person: Person;
    interview: UserInterviewAttributes;
}) => {
    // Ask only for all workers with fixed location
    const journey = odSurveyHelper.getJourneysArray({ person })[0];
    if (!person || !journey) {
        return false;
    }
    const workerType = person.workerType;
    const workPlaceType = person.workPlaceType;
    const workPlaceTypeIsCompatible =
        ['onLocation', 'onTheRoadWithUsualPlace', 'onTheRoadWithoutUsualPlace', 'hybrid'].includes(workPlaceType) &&
        ['fullTime', 'partTime'].includes(workerType);
    if (!workPlaceTypeIsCompatible) {
        return false;
    }

    const tripsDate = getResponse(interview, '_assignedDay', null);
    const tripsDateIsBusinessDay = moment(tripsDate).isBusinessDay();
    return tripsDateIsBusinessDay && getVisitedPlacesForCategory(journey, 'work').length === 0;
};

export const shouldAskForNoSchoolTripReason = ({
    person,
    interview
}: {
    person: Person;
    interview: UserInterviewAttributes;
}) => {
    // Ask only for full time students
    const journey = odSurveyHelper.getJourneysArray({ person })[0];
    if (!person || !journey) {
        return false;
    }
    const studentType = person.studentType;
    const schoolPlaceType = person.schoolPlaceType;
    const schoolPlaceIsCompatible =
        ['onLocation', 'hybrid'].includes(schoolPlaceType) && ['fullTime', 'partTime'].includes(studentType);
    const childrenCase = isStudentFromEnrolled(person);
    if (!(schoolPlaceIsCompatible || childrenCase)) {
        return false;
    }

    const tripsDate = getResponse(interview, '_assignedDay', null);
    const tripsDateIsBusinessDay = moment(tripsDate).isBusinessDay();

    return tripsDateIsBusinessDay && getVisitedPlacesForCategory(journey, 'school').length === 0;
};

const travelBehaviorForPersonComplete = function ({
    person,
    interview
}: {
    person: Person;
    interview: UserInterviewAttributes;
}) {
    // If the person is a child, we consider the travel behavior section as complete
    if (person && typeof person.age === 'number' && person.age < 5) {
        return true;
    }
    // If the person is not a student or worker, we consider the travel behavior section as complete
    if (person && !isStudent(person) && !isWorker(person)) {
        return true;
    }
    // Make sure the no trip reasons are answered if required
    const shouldAskNoSchoolTrip = shouldAskForNoSchoolTripReason({ person, interview });
    const shouldAskNoWorkTrip = shouldAskForNoWorkTripReason({ person, interview });
    if (!shouldAskNoSchoolTrip && !shouldAskNoWorkTrip) {
        return true;
    }
    const journey = odSurveyHelper.getJourneysArray({ person })[0] as any;
    return (
        (!shouldAskNoSchoolTrip || typeof journey.noSchoolTripReason === 'string') &&
        (!shouldAskNoWorkTrip || typeof journey.noWorkTripReason === 'string')
    );
};

/**
 * TODO Parameterize the fields and conditions to check for the section in
 * Evolution instead of requiring this function
 * @param person
 * @param interview
 * @returns Whether the trip diary and travel behavior is finished
 */
export const tripDiaryAndTravelBehaviorForPersonComplete = function (person, interview: UserInterviewAttributes) {
    // FIXME Add conditions as sections are added
    return (
        tripsIntroForPersonComplete(person, interview) &&
        tripsForPersonComplete({ person, interview }) &&
        travelBehaviorForPersonComplete({ person, interview })
    );
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
 * Whether the person is a worker
 * @param person
 * @returns
 */
export const isWorker = (person: Person) => {
    if (_isBlank(person)) {
        return false;
    }
    return ['fullTimeWorker', 'partTimeWorker', 'workerAndStudent'].includes(person.occupation);
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
type VisitedPlacesArrayByPersonId = {
    visitedPlaces: { visitedPlace: VisitedPlace; journey: Journey }[];
    visitedPlacesByPersonId: { [personId: string]: { visitedPlace: VisitedPlace; journey: Journey }[] };
    usualPlaces: VisitedPlace[];
    usualPlacesByPersonId: { [personId: string]: VisitedPlace[] };
};
export const getHouseholdVisitedAndUsualPlacesArrayAndByPersonId = function (interview): VisitedPlacesArrayByPersonId {
    const persons = odSurveyHelper.getPersonsArray({ interview });
    const visitedPlaces: VisitedPlacesArrayByPersonId['visitedPlaces'] = [];
    const visitedPlacesByPersonId: VisitedPlacesArrayByPersonId['visitedPlacesByPersonId'] = {};
    const usualPlaces: VisitedPlacesArrayByPersonId['usualPlaces'] = [];
    const usualPlacesByPersonId: VisitedPlacesArrayByPersonId['usualPlacesByPersonId'] = {};
    for (const person of persons) {
        const personJourney = odSurveyHelper.getJourneysArray({ person })[0];
        if (_isBlank(personJourney)) {
            continue; // Skip persons without journeys
        }
        const personVisitedPlacesArray = odSurveyHelper.getVisitedPlacesArray({ journey: personJourney });
        const visitedPlacesWithJourney = personVisitedPlacesArray.map((visitedPlace) => ({
            visitedPlace,
            journey: personJourney
        }));
        visitedPlaces.push(...visitedPlacesWithJourney);
        visitedPlacesByPersonId[person._uuid] = visitedPlacesWithJourney;

        // Get the person's usual places
        const personUsualPlaces = [];
        usualPlacesByPersonId[person._uuid] = personUsualPlaces;
        if ((person as any).usualWorkPlace) {
            personUsualPlaces.push({ ...(person as any).usualWorkPlace, activity: 'workUsual' });
        }
        if ((person as any).usualSchoolPlace) {
            personUsualPlaces.push({ ...(person as any).usualSchoolPlace, activity: 'schoolUsual' });
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
        const personVisitedPlacesAndJourney = visitedAndUsualPlacesArrayAndByPersonId.visitedPlacesByPersonId[personId];
        for (let i = 0, count = personVisitedPlacesAndJourney.length; i < count; i++) {
            const visitedPlace = personVisitedPlacesAndJourney[i];
            if (visitedPlace && visitedPlace.visitedPlace._uuid === shortcutVisitedPlaceId) {
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
    return persons.filter((person) => person.drivingLicenseOwnership === 'yes');
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
