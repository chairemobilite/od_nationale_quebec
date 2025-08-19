import _merge from 'lodash/merge';
import * as odSurveyHelper from 'evolution-common/lib/services/odSurvey/helpers';
import { SectionConfig } from 'evolution-common/lib/services/questionnaire/types';
import { widgetsNames } from './widgetsNames';
import { householdMembersSectionComplete, tripsIntroForPersonComplete } from '../../common/helper';
import { addGroupedObjects, getResponse } from 'evolution-common/lib/utils/helpers';
import { updateHouseholdSizeFromPersonCount } from '../../common/customHelpers';

export const currentSectionName: string = 'tripsIntro';
const previousSectionName: SectionConfig['previousSection'] = 'selectPerson';
const nextSectionName: SectionConfig['nextSection'] = 'visitedPlaces';

// Config for the section
export const sectionConfig: SectionConfig = {
    previousSection: previousSectionName,
    nextSection: nextSectionName,
    title: {
        fr: 'Introduction aux déplacements',
        en: 'Trips introduction'
    },
    widgets: widgetsNames,
    onSectionEntry: function (interview, iterationContext) {
        const needUpdateHouseholdSizeValues = updateHouseholdSizeFromPersonCount(interview);
        const person = odSurveyHelper.getPerson({
            interview,
            personId: iterationContext[iterationContext.length - 1]
        }) as any;
        // Validate the journey exists
        const journeys = odSurveyHelper.getJourneysArray({ person });

        // If the person has no journeys, we need to initialize a journey for them and make it the active one
        if (journeys.length === 0) {
            const newJourneysValuesByPath = addGroupedObjects(
                interview,
                1,
                1,
                `household.persons.${person._uuid}.journeys`,
                // Set the new person popup flag, the corresponding widget will determine if it needs to be displayed for this context
                [{ startDate: getResponse(interview, '_assignedDay'), _showNewPersonPopupButton: true }]
            );
            const newJourneyKey = Object.keys(newJourneysValuesByPath).find((key) =>
                key.startsWith(`response.household.persons.${person._uuid}.journeys.`)
            );
            // From the newJourneyKey, get the journey UUID as the rest of the string after the last dot
            const journeyUuid = newJourneyKey.split('.').pop();
            newJourneysValuesByPath['response._activeJourneyId'] = journeyUuid;
            return needUpdateHouseholdSizeValues
                ? _merge(needUpdateHouseholdSizeValues, newJourneysValuesByPath)
                : newJourneysValuesByPath;
        }

        // If the person has journeys, we need to make sure the active journey is set
        const currentJourney = journeys[0];
        const responseToUpdate = { 'response._activeJourneyId': currentJourney._uuid };

        // Initialize the departure place type based on the first visited place activity
        const visitedPlaces = odSurveyHelper.getVisitedPlacesArray({ journey: currentJourney });

        if (visitedPlaces.length >= 1) {
            const firstVisitedPlace = visitedPlaces[0];
            const firstActivity = firstVisitedPlace.activity;
            // make sure the departurePlaceOther matches the first visited place activity (if the respondent changes it after selecting the departure place other):
            responseToUpdate[
                `response.household.persons.${person._uuid}.journeys.${currentJourney._uuid}.departurePlaceIsHome`
            ] = firstActivity === 'home' ? 'yes' : 'no';
            if (firstActivity) {
                const firstActivityCategory = firstVisitedPlace.activityCategory;
                let departurePlaceOther = null;
                if (firstActivity === 'otherParentHome' || firstActivityCategory === 'otherParentHome') {
                    departurePlaceOther = 'otherParentHome';
                } else if (firstActivity === 'restaurant') {
                    departurePlaceOther = 'restaurant';
                } else if (firstActivity === 'secondaryHome') {
                    departurePlaceOther = 'secondaryHome';
                } else if (firstActivity === 'visiting') {
                    departurePlaceOther = 'sleptAtFriends';
                } else if (firstActivityCategory === 'work') {
                    departurePlaceOther = 'workedOvernight';
                } else if (firstActivityCategory === 'school') {
                    departurePlaceOther = 'studying';
                } else if (firstActivity !== 'home') {
                    departurePlaceOther = 'other';
                }
                if (departurePlaceOther !== (currentJourney as any).departurePlaceOther) {
                    responseToUpdate[
                        `response.household.persons.${person._uuid}.journeys.${currentJourney._uuid}.departurePlaceOther`
                    ] = departurePlaceOther;
                }
            }
        }
        return needUpdateHouseholdSizeValues
            ? _merge(needUpdateHouseholdSizeValues, responseToUpdate)
            : responseToUpdate;
    },
    onSectionExit: (interview, iterationContext) => {
        // Update the person visited places if there was a change
        const person = odSurveyHelper.getPerson({
            interview,
            personId: iterationContext[iterationContext.length - 1]
        }) as any;
        // Validate the journey exists
        const journey = odSurveyHelper.getJourneysArray({ person })[0];
        if (journey === undefined) {
            // This shouldn't happen, but log anyway, just in case
            console.error('No journey found for person:', person._uuid);
            return undefined;
        }
        const personDidTrips = (journey as any).personDidTrips;
        const personDidTripsChangeConfirm = (journey as any).personDidTripsChangeConfirm;
        if (personDidTrips === 'no' && personDidTripsChangeConfirm === 'yes') {
            // If the person did not make any trips, but then confirmed they actually did, reset the personDidTrips to yes
            return {
                [`response.household.persons.${person._uuid}.journeys.${journey._uuid}.personDidTrips`]: 'yes',
                [`response.household.persons.${person._uuid}.journeys.${journey._uuid}.personDidTripsChangeConfirm`]:
                    undefined
            };
        } else if (personDidTrips === 'no' && personDidTripsChangeConfirm === 'no') {
            // If the person confirms they did not make any trips, we need to remove the journeys and visited places
            return {
                [`response.household.persons.${person._uuid}.journeys.${journey._uuid}.visitedPlaces`]: undefined,
                [`response.household.persons.${person._uuid}.journeys.${journey._uuid}.trips`]: undefined,
                [`response.household.persons.${person._uuid}.journeys.${journey._uuid}.personDidTripsChangeConfirm`]:
                    undefined
            };
        }
        return undefined;
    },
    enableConditional: function (interview) {
        const person = odSurveyHelper.getPerson({ interview });
        return householdMembersSectionComplete(interview);
    },
    isSectionCompleted: function (interview) {
        const person = odSurveyHelper.getPerson({ interview });
        return householdMembersSectionComplete(interview) && tripsIntroForPersonComplete(person, interview);
    }
};

export default sectionConfig;
