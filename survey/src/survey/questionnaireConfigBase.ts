import { QuestionnaireConfiguration } from 'evolution-common/lib/services/questionnaire/types';
import { personVisitedPlacesWidgetsNames } from './sections/visitedPlaces/widgetsNames';
import { segmentsWidgetsNames } from './sections/segments/widgetsNames';
import { Mode } from 'evolution-common/lib/services/baseObjects/attributeTypes/SegmentAttributes';

export const questionnaireConfiguration: QuestionnaireConfiguration = {
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
                inlineUsualPlacesEntry: false,
                tripDiaryMaxTimeOfDay: 28 * 60 * 60, // 28h in seconds (i.e. 4h the next day)
                tripDiaryMinTimeOfDay: 4 * 60 * 60, // 4h in seconds
                additionalVisitedPlacesWidgetNames: personVisitedPlacesWidgetsNames
            }
        }
    }
};
