import { SectionConfig } from 'evolution-common/lib/services/questionnaire/types';
import * as odSurveyHelper from 'evolution-common/lib/services/odSurvey/helpers';
import { householdMembersSectionComplete, tripDiaryAndTravelBehaviorForPersonComplete } from '../../common/helper';

export const currentSectionName: string = 'personsTrips';
const previousSectionName: SectionConfig['previousSection'] = 'household';
const nextSectionName: SectionConfig['nextSection'] = 'end';

// Config for the section
export const sectionConfig: SectionConfig = {
    previousSection: previousSectionName,
    nextSection: nextSectionName,
    title: {
        fr: 'Sélection du membre du ménage',
        en: 'Household member selection'
    },
    navMenu: {
        type: 'inNav',
        menuName: {
            fr: 'Déplacements',
            en: 'Trips'
        }
    },
    widgets: [],
    enableConditional: function (interview) {
        return householdMembersSectionComplete(interview);
    },
    completionConditional: function (interview) {
        const persons = odSurveyHelper.getInterviewablePersonsArray({ interview });
        return (
            householdMembersSectionComplete(interview) &&
            persons.every((person) => tripDiaryAndTravelBehaviorForPersonComplete(person, interview))
        );
    },
    repeatedBlock: {
        iterationRule: {
            type: 'builtin',
            path: 'interviewablePersons'
        },
        // FIXME Change for random when https://github.com/chairemobilite/evolution/issues/1064 is fixed
        order: 'sequential',
        selectionSectionId: 'tripsSelectPerson',
        skipSelectionInNaturalFlow: true,
        activeSurveyObjectPath: '_activePersonId',
        pathPrefix: 'person',
        sections: ['tripsSelectPerson', 'tripsIntro', 'visitedPlaces', 'segments'],
        isIterationValid: (interview, iterationContext) => {
            const personId = iterationContext[iterationContext.length - 1];
            const person = odSurveyHelper.getPerson({ interview, personId });
            return tripDiaryAndTravelBehaviorForPersonComplete(person, interview);
        }
    }
};

export default sectionConfig;
