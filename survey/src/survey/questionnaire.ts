import _merge from 'lodash/merge';
import customSurveySections from './sections';
import { widgets } from './widgetsConfigs';
import { widgetFactoryOptions } from './common/helper';
import { getAndValidateSurveySections, SectionConfig } from 'evolution-common/lib/services/questionnaire/types';
import { QuestionnaireFactory } from 'evolution-common/lib/services/questionnaire';
import { updateHouseholdSizeFromPersonCount } from './common/customHelpers';
import { questionnaireConfiguration } from './questionnaireConfigBase';

const questionnaireFactory = new QuestionnaireFactory(questionnaireConfiguration, widgetFactoryOptions);
const { surveySections, widgetsConfig } = questionnaireFactory.buildSectionsAndWidgets();

const segmentSectionConfigFromFactory = surveySections['segments'];

// Add the segments section to the exported configuration
const segmentConfig: SectionConfig = {
    ...segmentSectionConfigFromFactory,
    // FIXME Remove this override when we don't need to manually update the household size in every section
    onSectionEntry: function (interview, iterationContext) {
        const segmentValuesToUpdate = segmentSectionConfigFromFactory.onSectionEntry!(interview, iterationContext);
        const needUpdateHouseholdSizeValues = updateHouseholdSizeFromPersonCount(interview);
        return !segmentValuesToUpdate && !needUpdateHouseholdSizeValues
            ? undefined
            : _merge(segmentValuesToUpdate || {}, needUpdateHouseholdSizeValues || {});
    }
};

const visitedPlacesSectionConfigFromFactory = surveySections['visitedPlaces'];

// Add the section configs to the exported configuration. Unordered, but should be fine.
const validatedSections = getAndValidateSurveySections({
    ...customSurveySections,
    visitedPlaces: visitedPlacesSectionConfigFromFactory,
    segments: segmentConfig
});

// Widgets defined in the interview will override the ones from the section factory, if any
const allWidgetConfig = Object.assign({}, widgetsConfig, widgets);

export { validatedSections as surveySections, allWidgetConfig as widgetsConfig };
