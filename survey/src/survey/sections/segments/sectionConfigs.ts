import _merge from 'lodash/merge';
import * as odSurveyHelper from 'evolution-common/lib/services/odSurvey/helpers';
import { SectionConfig } from 'evolution-common/lib/services/questionnaire/types';
import { SegmentsSectionFactory } from 'evolution-common/lib/services/questionnaire/sections/segments/sectionSegments';
import { widgetsNames } from './widgetsNames';
import { updateHouseholdSizeFromPersonCount } from '../../common/customHelpers';
import { widgetFactoryOptions } from '../../common/helper';

export const currentSectionName: string = 'segments';
const nextSectionName: SectionConfig['nextSection'] = 'travelBehavior';

const segmentSectionConfig = new SegmentsSectionFactory(
    { type: 'segments', enabled: true },
    widgetFactoryOptions
).getSectionConfig();
// Config for the section
// FIXME Now using the builtin config for this section. Kept to make sure there's a section available for now. Remove when https://github.com/chairemobilite/evolution/issues/1531 is fixed
export const sectionConfig: SectionConfig = {
    ...segmentSectionConfig,
    // FIXME Remove this line when the next section becomes travelBehavior
    nextSection: nextSectionName
};

export default sectionConfig;
