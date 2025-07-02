import * as odSurveyHelper from 'evolution-common/lib/services/odSurvey/helpers';
import { SectionConfig } from 'evolution-common/lib/services/questionnaire/types';
import { widgetsNames } from './widgetsNames';
import { householdMembersSectionComplete, tripsIntroForPersonComplete } from '../../common/helper';
import { addGroupedObjects, getResponse } from 'evolution-common/lib/utils/helpers';

export const currentSectionName: string = 'tripsIntro';
const previousSectionName: SectionConfig['previousSection'] = 'tripsSelectPerson';
const nextSectionName: SectionConfig['nextSection'] = 'personsTrips';

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
                [{ startDate: getResponse(interview, 'assignedDay') }]
            );
            const newJourneyKey = Object.keys(newJourneysValuesByPath).find((key) =>
                key.startsWith(`response.household.persons.${person._uuid}.journeys.`)
            );
            // From the newJourneyKey, get the journey UUID as the rest of the string after the last dot
            const journeyUuid = newJourneyKey.split('.').pop();
            newJourneysValuesByPath['response._activeJourneyId'] = journeyUuid;
            return newJourneysValuesByPath;
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
        return responseToUpdate;
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
