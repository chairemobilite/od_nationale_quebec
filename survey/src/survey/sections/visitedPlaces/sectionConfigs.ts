// This file was manually generated for this section
import _merge from 'lodash/merge';
import * as odSurveyHelper from 'evolution-common/lib/services/odSurvey/helpers';
import { SectionConfig } from 'evolution-common/lib/services/questionnaire/types';
import { widgetsNames } from './widgetsNames';
import { householdMembersSectionComplete, selectNextIncompleteVisitedPlace } from '../../common/helper';
import { addGroupedObjects } from 'evolution-common/lib/utils/helpers';
import { updateHouseholdSizeFromPersonCount } from '../../common/customHelpers';

export const currentSectionName: string = 'visitedPlaces';
const previousSectionName: SectionConfig['previousSection'] = 'tripsIntro';
const nextSectionName: SectionConfig['nextSection'] = 'segments';

// Config for the section
export const sectionConfig: SectionConfig = {
    previousSection: previousSectionName,
    nextSection: nextSectionName,
    title: {
        fr: 'Déplacements',
        en: 'Trips'
    },
    widgets: widgetsNames,
    template: 'visitedPlaces',
    onSectionEntry: function (interview, iterationContext) {
        const needUpdateHouseholdSizeValues = updateHouseholdSizeFromPersonCount(interview);
        const person = odSurveyHelper.getPerson({
            interview,
            personId: iterationContext[iterationContext.length - 1]
        }) as any;
        // Validate the journey exists
        const journeys = odSurveyHelper.getJourneysArray({ person });
        const journey = journeys[0];

        if (journey === undefined) {
            // This shouldn't happen, but log anyway, just in case
            console.error('No journey found for person:', person._uuid);
            return needUpdateHouseholdSizeValues;
        }

        const updatedValuesByPath = {};
        const visitedPlaces = odSurveyHelper.getVisitedPlacesArray({ journey });
        // Add home as first visited place an add a second one
        if (visitedPlaces.length === 0 && (journey as any).departurePlaceIsHome === 'yes') {
            // Add 2 places: home and the next one
            const newVisitedPlacesValuesByPath = addGroupedObjects(
                interview,
                2,
                1,
                `household.persons.${person._uuid}.journeys.${journey._uuid}.visitedPlaces`,
                [
                    {
                        activity: 'home',
                        activityCategory: 'home',
                        nextPlaceCategory: 'visitedAnotherPlace'
                    },
                    {}
                ]
            );
            Object.assign(updatedValuesByPath, newVisitedPlacesValuesByPath);
            // Select the second place as active place
            for (const path in newVisitedPlacesValuesByPath) {
                if ((newVisitedPlacesValuesByPath[path] as any)._sequence === 2) {
                    updatedValuesByPath['response._activeVisitedPlaceId'] = (
                        newVisitedPlacesValuesByPath[path] as any
                    )._uuid;
                    break;
                }
            }
        } else if (visitedPlaces.length === 0) {
            // Add the first visited place based on the departurePlaceOther
            let firstActivity = null;
            let firstActivityCategory = null;
            if ((journey as any).departurePlaceOther) {
                if ((journey as any).departurePlaceOther === 'otherParentHome') {
                    firstActivity = 'otherParentHome';
                    firstActivityCategory = 'otherParentHome';
                } else if ((journey as any).departurePlaceOther === 'restaurant') {
                    firstActivity = 'restaurant';
                    firstActivityCategory = 'shoppingServiceRestaurant';
                } else if ((journey as any).departurePlaceOther === 'secondaryHome') {
                    firstActivity = 'secondaryHome';
                    firstActivityCategory = 'leisure';
                } else if ((journey as any).departurePlaceOther === 'sleptAtFriends') {
                    firstActivity = 'visiting';
                    firstActivityCategory = 'leisure';
                } else if ((journey as any).departurePlaceOther === 'hotelForWork') {
                    firstActivity = 'workNotUsual';
                    firstActivityCategory = 'work';
                } else if ((journey as any).departurePlaceOther === 'hotelForVacation') {
                    firstActivity = 'leisureTourism';
                    firstActivityCategory = 'leisure';
                } else if ((journey as any).departurePlaceOther === 'studying') {
                    firstActivity = null; // must be specified in the visited places section
                    firstActivityCategory = 'school';
                } else if ((journey as any).departurePlaceOther === 'workedOvernight') {
                    firstActivity = null; // must be specified in the visited places section
                    firstActivityCategory = 'work';
                }
            }

            const addValuesByPath = addGroupedObjects(
                interview,
                1,
                1,
                `household.persons.${person._uuid}.journeys.${journey._uuid}.visitedPlaces`,
                [
                    {
                        activity: firstActivity,
                        activityCategory: firstActivityCategory
                    }
                ]
            );
            Object.assign(updatedValuesByPath, addValuesByPath);
            // Select the new place as active place
            for (const path in addValuesByPath) {
                if ((addValuesByPath[path] as any)._sequence === 1) {
                    updatedValuesByPath['response._activeVisitedPlaceId'] = (addValuesByPath[path] as any)._uuid;
                    break;
                }
            }
        } else {
            // Just select the next visited place ID
            const incompleteVisitedPlace = selectNextIncompleteVisitedPlace({
                interview,
                visitedPlaces,
                person
            });
            updatedValuesByPath['response._activeVisitedPlaceId'] = incompleteVisitedPlace
                ? incompleteVisitedPlace._uuid
                : null;
        }

        return needUpdateHouseholdSizeValues
            ? _merge(needUpdateHouseholdSizeValues, updatedValuesByPath)
            : updatedValuesByPath;
    },
    enableConditional: function (interview) {
        return householdMembersSectionComplete(interview);
    },
    isSectionCompleted: function (interview, iterationContext) {
        // Section is complete when the last visited place is complete
        const person = odSurveyHelper.getPerson({
            interview,
            personId: iterationContext[iterationContext.length - 1]
        }) as any;
        const journey = person ? odSurveyHelper.getJourneysArray({ person })[0] : undefined;
        const visitedPlaces = journey ? odSurveyHelper.getVisitedPlacesArray({ journey }) : [];
        return (
            visitedPlaces.length > 0 && selectNextIncompleteVisitedPlace({ interview, visitedPlaces, person }) === null
        );
    },
    isSectionVisible: (interview, iterationContext) => {
        const person = odSurveyHelper.getPerson({
            interview,
            personId: iterationContext[iterationContext.length - 1]
        }) as any;
        const journey = person ? odSurveyHelper.getJourneysArray({ person })[0] : undefined;
        // Visible if either the person says has trips or has confirmed she still have trips (the value will be reset later on tripsIntro exit)
        return (
            journey &&
            ((journey as any).personDidTrips === 'yes' || (journey as any).personDidTripsChangeConfirm === 'yes')
        );
    }
};

export default sectionConfig;
