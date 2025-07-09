import _get from 'lodash/get';
import _isEqual from 'lodash/isEqual';
import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import * as odSurveyHelper from 'evolution-common/lib/services/odSurvey/helpers';

import { getVisitedPlaceDescription } from 'evolution-frontend/lib/services/display/frontendHelper';
import { getHouseholdVisitedAndUsualPlacesArrayAndByPersonId } from './helper';

/**
 * FIXME In frontendHelper because of the use of getVisitedPlaceDescription
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
            const visitedPlaceDescription = getVisitedPlaceDescription(visitedPlace, true, false);
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
            const visitedPlace = personVisitedPlaces[i];

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
            const visitedPlaceDescription = getVisitedPlaceDescription(visitedPlace, true, false);
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
                    visitedPlaceId: `household.persons.${personId}.visitedPlaces.${visitedPlace._uuid}`,
                    description: visitedPlaceDescription
                });
            }
        }
    }
    return shortcutsOrderedByPerson;
};
