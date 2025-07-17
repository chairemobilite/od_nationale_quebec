import { SectionConfig } from 'evolution-common/lib/services/questionnaire/types';
import { widgetsNames } from './widgetsNames';
import { householdMembersSectionComplete } from '../../common/helper';
import { getResponse } from 'evolution-common/lib/utils/helpers';
import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';

export const currentSectionName: string = 'selectPerson';
const previousSectionName: SectionConfig['previousSection'] = 'personsTrips';
const nextSectionName: SectionConfig['nextSection'] = 'tripsIntro';

// Config for the section
export const sectionConfig: SectionConfig = {
    previousSection: previousSectionName,
    nextSection: nextSectionName,
    title: {
        fr: 'Sélection du membre du ménage',
        en: 'Household member selection'
    },
    widgets: widgetsNames,
    // Allow to click on the section menu
    enableConditional: function (interview) {
        return householdMembersSectionComplete(interview);
    },
    isSectionCompleted: (interview, _iterationContext) => {
        // Completed if there is an active person ID set
        const activePersonId = getResponse(interview, '_activePersonId');
        return !_isBlank(activePersonId);
    }
    // FIXME In od_nationale_2024 and previous, there was a _showNewPersonPopup logic in this section's preload. Figure out the specs for the appearance of this popup and handle it here.
};

export default sectionConfig;
