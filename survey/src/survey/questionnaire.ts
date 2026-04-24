import _merge from 'lodash/merge';
import customSurveySections from './sections';
import { widgets } from './widgetsConfigs';
import { widgetFactoryOptions } from './common/helper';
import {
    getAndValidateSurveySections,
    SectionConfig,
    QuestionnaireConfiguration
} from 'evolution-common/lib/services/questionnaire/types';
import { QuestionnaireFactory } from 'evolution-common/lib/services/questionnaire';
import { personVisitedPlacesWidgetsNames } from './sections/visitedPlaces/widgetsNames';
import { segmentsWidgetsNames } from './sections/segments/widgetsNames';
import { Mode } from 'evolution-common/lib/services/baseObjects/attributeTypes/SegmentAttributes';
import { updateHouseholdSizeFromPersonCount } from './common/customHelpers';

const questionnaireConfiguration: QuestionnaireConfiguration = {
    tripDiary: {
        sections: {
            segments: {
                type: 'segments' as const,
                enabled: true,
                askSegmentDriver: true,
                additionalSegmentWidgetNames: segmentsWidgetsNames,
                modesIncludeOnly: [
                    'walk',
                    'bicycle',
                    'bicycleElectric',
                    'kickScooterElectric',
                    'wheelchair',
                    'mobilityScooter',
                    'transitBus',
                    'transitRRT',
                    'transitLRRT',
                    'transitRegionalRail',
                    'transitStreetCar',
                    'transitTaxi',
                    'intercityBus',
                    'schoolBus',
                    'otherBus',
                    'carDriver',
                    'carDriverCarsharing',
                    'carDriverRental',
                    'motorcycle',
                    'transitFerry',
                    'ferryWithCar',
                    'intercityTrain',
                    'carPassenger',
                    'paratransit',
                    'plane',
                    'other',
                    'taxi',
                    'dontKnow'
                ] as Mode[]
            },
            visitedPlaces: {
                type: 'visitedPlaces' as const,
                enabled: true,
                tripDiaryMaxTimeOfDay: 28 * 60 * 60, // 28h in seconds (i.e. 4h the next day)
                tripDiaryMinTimeOfDay: 4 * 60 * 60, // 4h in seconds
                additionalVisitedPlacesWidgetNames: personVisitedPlacesWidgetsNames
            }
        }
    }
};

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
