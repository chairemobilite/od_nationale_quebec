import * as odSurveyHelper from 'evolution-common/lib/services/odSurvey/helpers';
import { SectionConfig } from 'evolution-common/lib/services/questionnaire/types';
import { widgetsNames } from './widgetsNames';
import {
    householdMembersSectionComplete,
    tripDiaryAndTravelBehaviorForPersonComplete,
    tripsForPersonComplete,
    tripsIntroForPersonComplete
} from '../../common/helper';
import { checkConditional } from 'evolution-frontend/lib/actions/utils/Conditional';
import { personNoWorkTripReason, personNoSchoolTripReason } from './widgets';

export const currentSectionName: string = 'travelBehavior';
const previousSectionName: SectionConfig['previousSection'] = 'segments';
const nextSectionName: SectionConfig['nextSection'] = 'personsTrips';

// Config for the section
export const sectionConfig: SectionConfig = {
    previousSection: previousSectionName,
    nextSection: nextSectionName,
    title: {
        fr: 'Mobilité',
        en: 'Travel behavior'
    },
    widgets: widgetsNames,
    enableConditional: function (interview) {
        const person = odSurveyHelper.getPerson({ interview });
        const journey = person !== null ? odSurveyHelper.getJourneysArray({ person })[0] : null;
        if (journey === null) {
            return false;
        }
        return householdMembersSectionComplete(interview) && tripsForPersonComplete({ person, interview });
    },
    isSectionCompleted: function (interview) {
        const person = odSurveyHelper.getPerson({ interview });
        return (
            householdMembersSectionComplete(interview) && tripDiaryAndTravelBehaviorForPersonComplete(person, interview)
        );
    },
    isSectionVisible: function (interview, iterationContext) {
        const person = odSurveyHelper.getPerson({
            interview,
            personId: iterationContext[iterationContext.length - 1]
        }) as any;
        const journey = odSurveyHelper.getJourneysArray({ person })[0];
        // Check the conditional of the personNoWorkTripReason, personNoSchoolTripReason and personWhoAnsweredForThisPerson widgets
        const [personNoWorkTripConditional] = checkConditional(
            personNoWorkTripReason.conditional as any,
            interview,
            `household.persons.${person._uuid}.journeys.${journey._uuid}.noWorkTripReason`
        );
        const [personNoSchoolTripConditional] = checkConditional(
            personNoSchoolTripReason.conditional as any,
            interview,
            `household.persons.${person._uuid}.journeys.${journey._uuid}.noSchoolTripReason`
        );
        return person && (personNoWorkTripConditional === true || personNoSchoolTripConditional === true);
    }
};

export default sectionConfig;
