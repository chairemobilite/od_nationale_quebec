import _get from 'lodash/get';
import _isEqual from 'lodash/isEqual';
import i18n from 'i18next';
import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import * as odSurveyHelper from 'evolution-common/lib/services/odSurvey/helpers';
import { Person, VisitedPlace } from 'evolution-common/lib/services/questionnaire/types';
import { secondsSinceMidnightToTimeStr } from 'chaire-lib-common/lib/utils/DateTimeUtils';
import { getHouseholdVisitedAndUsualPlacesArrayAndByPersonId } from './helper';

export interface VisitedPlaceDescriptionOptions {
    withTimes?: boolean;
    withActivity?: boolean;
    withNickname?: boolean;
    allowHtml?: boolean;
}

/**
 * FIXME: Add these new parameters to the frontendHelper function
 * getVisitedPlaceDescription in evolution-frontend
 *
 * Get the visited place shortcut description
 * Shortcut should not show the activity since it can make the respondent
 * think they cannot do another activity at the same place, so we put only
 * the place name, the person nickname and the times.
 * However, if the place name is absent, we show the activity name.
 * @param visitedPlace The visited place for which to get the description
 * @param person The person who went to this visited place
 * @param options Configuration options for the description
 * @param options.withTimes Whether to add the times to the description (default: false)
 * @param options.withActivity Whether to add the activity name to the description (default: true)
 * If place name is empty, it will show activity name, even if this flag is false.
 * If place name is not empty, it will only be shown if this flag is true.
 * @param options.withNickname Whether to include the person's nickname (default: true)
 * @param options.allowHtml Whether the description can contain HTML characters (default: true)
 * @returns The formatted description string
 */
export const getVisitedPlaceDescription = function (
    visitedPlace: VisitedPlace,
    person: Person | undefined | null,
    options: VisitedPlaceDescriptionOptions = {}
): string {
    const { withTimes = false, withActivity = true, withNickname = true, allowHtml = true } = options;
    const contentParts: string[] = [];

    // Add place name (if available)
    if (visitedPlace.name) {
        contentParts.push(allowHtml ? `<em>${visitedPlace.name}</em>` : visitedPlace.name);
    }

    // Add nickname
    if (withNickname && person && person.nickname) {
        contentParts.push(person.nickname);
    }

    // Add activity (always last before times)
    // If no place name, activity is required; if place name exists, show activity only if withActivity is true
    if (!visitedPlace.name || withActivity) {
        const activityText = i18n.t(`survey:visitedPlace:activities:${visitedPlace.activity}`);
        if (activityText) {
            contentParts.push(activityText);
        }
    }

    // Add times if requested and available
    let timesPart = '';
    if (withTimes) {
        const arrivalTime =
            visitedPlace.arrivalTime !== undefined && visitedPlace.arrivalTime !== null
                ? secondsSinceMidnightToTimeStr(visitedPlace.arrivalTime)
                : '';
        const departureTime =
            visitedPlace.departureTime !== undefined && visitedPlace.departureTime !== null
                ? secondsSinceMidnightToTimeStr(visitedPlace.departureTime)
                : '';

        if (arrivalTime || departureTime) {
            let timeString = '';
            if (arrivalTime && departureTime) {
                timeString = `${arrivalTime} -> ${departureTime}`;
            } else if (arrivalTime) {
                timeString = `${arrivalTime} ->`;
            } else if (departureTime) {
                timeString = `-> ${departureTime}`;
            }
            timesPart = ` (${timeString})`;
        }
    }

    return contentParts.join(' • ') + timesPart;
};

/**
 * @param interview
 * @returns
 */
export const getShortcutVisitedPlaces = (interview) => {
    const currentPerson = odSurveyHelper.getPerson({ interview });
    const currentJourney = odSurveyHelper.getActiveJourney({ interview });
    const currentVisitedPlace = odSurveyHelper.getActiveVisitedPlace({
        interview,
        journey: currentJourney
    });
    const previousVisitedPlace = odSurveyHelper.getPreviousVisitedPlace({
        journey: currentJourney,
        visitedPlaceId: currentVisitedPlace._uuid
    });
    const previousVisitedPlaceGeography = previousVisitedPlace
        ? odSurveyHelper.getVisitedPlaceGeography({
            visitedPlace: previousVisitedPlace,
            interview,
            person: currentPerson
        })
        : undefined;
    const previousVisitedPlaceCoordinates = _get(previousVisitedPlaceGeography, 'geometry.coordinates', null);
    const visitedAndUsualPlacesArrayAndByPersonId = getHouseholdVisitedAndUsualPlacesArrayAndByPersonId(interview);
    const shortcutsOrderedByPerson = [];
    // Add usual places of the persons
    for (const personId in visitedAndUsualPlacesArrayAndByPersonId.usualPlacesByPersonId) {
        const person = odSurveyHelper.getPerson({ interview, personId });
        const personUsualPlaces = visitedAndUsualPlacesArrayAndByPersonId.usualPlacesByPersonId[personId];
        for (let i = 0, count = personUsualPlaces.length; i < count; i++) {
            const visitedPlace = personUsualPlaces[i];
            const visitedPlaceGeography = odSurveyHelper.getVisitedPlaceGeography({ visitedPlace, interview, person });
            const visitedPlaceCoordinates = _get(visitedPlaceGeography, 'geometry.coordinates', null);
            const visitedPlaceDescription = getVisitedPlaceDescription(visitedPlace, person, {
                withTimes: true,
                withActivity: false,
                withNickname: true,
                allowHtml: false
            });
            if (
                visitedPlace._uuid !== currentVisitedPlace._uuid &&
                !_isBlank(visitedPlaceCoordinates) &&
                (_isBlank(previousVisitedPlaceCoordinates) ||
                    !_isEqual(visitedPlaceCoordinates, previousVisitedPlaceCoordinates))
            ) {
                shortcutsOrderedByPerson.push({
                    personNickname: person.nickname,
                    visitedPlaceId: `household.persons.${personId}.${visitedPlace.activity === 'workUsual' ? 'usualWorkPlace' : 'usualSchoolPlace'}`,
                    description: visitedPlaceDescription
                });
            }
        }
    }
    // Add the visited places of the persons
    for (const personId in visitedAndUsualPlacesArrayAndByPersonId.visitedPlacesByPersonId) {
        const person = odSurveyHelper.getPerson({ interview, personId });
        const personVisitedPlaces = visitedAndUsualPlacesArrayAndByPersonId.visitedPlacesByPersonId[personId];
        for (let i = 0, count = personVisitedPlaces.length; i < count; i++) {
            const visitedPlace = personVisitedPlaces[i].visitedPlace;

            // Ignore places that are already shortcuts or usual places
            if (
                visitedPlace.shortcut ||
                (visitedPlace.activity === 'workUsual' &&
                    (person as any).usualWorkPlace &&
                    (person as any).usualWorkPlace.geography) ||
                (visitedPlace.activity === 'schoolUsual' &&
                    (person as any).usualSchoolPlace &&
                    (person as any).usualSchoolPlace.geography)
            ) {
                continue;
            }

            const visitedPlaceGeography = odSurveyHelper.getVisitedPlaceGeography({ visitedPlace, interview, person });
            const visitedPlaceCoordinates = _get(visitedPlaceGeography, 'geometry.coordinates', null);
            const visitedPlaceDescription = getVisitedPlaceDescription(visitedPlace, person, {
                withTimes: true,
                withActivity: false,
                withNickname: true,
                allowHtml: false
            });
            if (
                visitedPlace.activity !== 'home' &&
                visitedPlace.activity !== 'workOnTheRoad' &&
                visitedPlace._uuid !== currentVisitedPlace._uuid &&
                !_isBlank(visitedPlaceCoordinates) &&
                (_isBlank(previousVisitedPlaceCoordinates) ||
                    !_isEqual(visitedPlaceCoordinates, previousVisitedPlaceCoordinates))
            ) {
                shortcutsOrderedByPerson.push({
                    personNickname: person.nickname,
                    visitedPlaceId: `household.persons.${personId}.journeys.${personVisitedPlaces[i].journey._uuid}.visitedPlaces.${visitedPlace._uuid}`,
                    description: visitedPlaceDescription
                });
            }
        }
    }
    return shortcutsOrderedByPerson;
};
