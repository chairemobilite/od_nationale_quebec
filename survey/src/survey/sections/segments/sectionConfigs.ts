import _merge from 'lodash/merge';
import * as odSurveyHelper from 'evolution-common/lib/services/odSurvey/helpers';
import { SectionConfig } from 'evolution-common/lib/services/questionnaire/types';
import { getSegmentsSectionConfig } from 'evolution-common/lib/services/questionnaire/sections/segments/sectionSegments';
import { widgetsNames } from './widgetsNames';
import { updateHouseholdSizeFromPersonCount } from '../../common/customHelpers';

export const currentSectionName: string = 'segments';
const nextSectionName: SectionConfig['nextSection'] = 'travelBehavior';

const segmentSectionConfig = getSegmentsSectionConfig({});
// Config for the section
export const sectionConfig: SectionConfig = {
    ...segmentSectionConfig,
    // FIXME Remove this line when the next section becomes travelBehavior
    nextSection: nextSectionName,
    isSectionVisible: function (interview, iterationContext) {
        // FIXME: This is the same visibility logic as the visited places. It
        // should be configurable in some kind of helper called by the main
        // component.
        const person = odSurveyHelper.getPerson({
            interview,
            personId: iterationContext[iterationContext.length - 1]
        }) as any;
        const journey = person ? odSurveyHelper.getJourneysArray({ person })[0] : undefined;
        return journey && (journey as any).personDidTrips === 'yes';
    },
    onSectionEntry: function (interview, iterationContext) {
        const segmentValuesToUpdate = segmentSectionConfig.onSectionEntry!(interview, iterationContext);
        const needUpdateHouseholdSizeValues = updateHouseholdSizeFromPersonCount(interview);
        return !segmentValuesToUpdate && !needUpdateHouseholdSizeValues
            ? undefined
            : _merge(segmentValuesToUpdate || {}, needUpdateHouseholdSizeValues || {});
    },
    widgets: widgetsNames
};

export default sectionConfig;
