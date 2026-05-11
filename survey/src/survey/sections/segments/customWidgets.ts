import _get from 'lodash/get';
import _upperFirst from 'lodash/upperFirst';
import _escape from 'lodash/escape';
import config from 'evolution-common/lib/config/project.config';
import * as WidgetConfig from 'evolution-common/lib/services/questionnaire/types';
import * as odSurveyHelpers from 'evolution-common/lib/services/odSurvey/helpers';
import * as validations from 'evolution-common/lib/services/widgets/validations/validations';
import { TFunction } from 'i18next';
import { formatGeocodingQueryStringFromMultipleFields, getResponse } from 'evolution-common/lib/utils/helpers';
import { shouldDisplayTripJunction } from '../../common/helper';
import { _booleish, _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import { getModeIcon } from 'evolution-common/lib/services/questionnaire/sections/segments/modeIconMapping';
import { loopActivities } from 'evolution-common/lib/services/odSurvey/types';
import { inaccessibleZoneGeographyCustomValidation } from '../../common/customValidations';

let busRoutes = { type: 'FeatureCollection', features: [] };

// Use async immediately invoked function (IIFE) to handle dynamic import instead of using a require, which causes linter error
(async () => {
    try {
        // FIXME Can't use dynamic import as webpack does not find the file and complains the dependency is an expression
        /* eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports */
        busRoutes = require(`../../config/busRoutes${_upperFirst(process.env.EV_VARIANT)}.json`);
        busRoutes.features = busRoutes.features.sort((a, b) =>
            (a.properties.sortableName || '').localeCompare(b.properties.sortableName)
        );
    } catch (error) {
        // No bus routes found for this ev variant, it's ok, the question just won't be asked
        console.log('No bus routes found for this survey');
    }
})();

const howToBusChoices = [
    {
        value: 'walk',
        label: {
            fr: '<strong>Marche</strong>',
            en: '<strong>Walking</strong>'
        },
        iconPath: getModeIcon('walk')
    },
    {
        value: 'bicycle',
        label: {
            fr: '<strong>Vélo</strong>',
            en: '<strong>Bicycle</strong>'
        },
        iconPath: getModeIcon('bicycle')
    },
    {
        value: 'bicycleElectric',
        label: {
            fr: '<strong>Vélo électrique</strong>',
            en: '<strong>E-Bike</strong> (electric bicycle)'
        },
        // FIXME bicycleElectric is not a mode (see comment in segmentModeChoices), use a function when bicycle type is available in Evolution
        iconPath: '/dist/icons/modes/bicycle/bicycle_without_rider_electric.svg'
    },
    {
        value: 'kickScooterElectric',
        label: {
            fr: '<strong>Trottinette électrique</strong>',
            en: '<strong>E-Scooter</strong> (electric scooter)'
        },
        iconPath: getModeIcon('kickScooterElectric')
    },
    {
        value: 'wheelchair',
        label: {
            fr: '<strong>Chaise roulante</strong>',
            en: '<strong>Wheelchair</strong>'
        },
        iconPath: getModeIcon('wheelchair'),
        conditional: function (interview, path) {
            const person = odSurveyHelpers.getActivePerson({ interview });
            return person && odSurveyHelpers.personMayHaveDisability({ person });
        }
    },
    {
        value: 'mobilityScooter',
        label: {
            fr: '<strong>Quadriporteur/Triporteur</strong>',
            en: '<strong>Mobility scooter</strong>'
        },
        iconPath: getModeIcon('mobilityScooter'),
        conditional: function (interview, path) {
            const person = odSurveyHelpers.getActivePerson({ interview });
            return person && odSurveyHelpers.personMayHaveDisability({ person });
        }
    },
    {
        value: 'paratransit',
        label: {
            fr: '<strong>Transport adapté</strong>',
            en: '<strong>Paratransit</strong>'
        },
        iconPath: getModeIcon('paratransit'),
        conditional: function (interview, path) {
            const segment: any = getResponse(interview, path, null, '../');
            const mode = segment ? segment.mode : null;
            const person = odSurveyHelpers.getActivePerson({ interview });
            // paratransit can be used by an accompanying person too, so show this mode for any household with at least one person with disability:
            return (
                (mode !== 'paratransit' && person && odSurveyHelpers.personMayHaveDisability({ person })) ||
                odSurveyHelpers.householdMayHaveDisability({ interview })
            );
        }
    }
];

export const segmentHowToBus: WidgetConfig.InputRadioType = {
    type: 'question',
    path: 'howToBus',
    inputType: 'radio',
    containsHtml: true,
    twoColumns: false,
    datatype: 'string',
    iconSize: '1.5em',
    columns: 1,
    choices: howToBusChoices,
    label: (t: TFunction, interview, path) => {
        const person = odSurveyHelpers.getActivePerson({ interview });
        return t('segments:howToBus', {
            context: person?.gender || person?.sexAssignedAtBirth,
            nickname: _escape(person.nickname),
            count: odSurveyHelpers.getCountOrSelfDeclared({ interview, person })
        });
    },
    conditional: function (interview, path) {
        const segment: any = getResponse(interview, path, null, '../');
        const modePre = segment ? segment.modePre : null;
        const mode = segment ? segment.mode : null;

        const trip = odSurveyHelpers.getActiveTrip({ interview });
        const segmentsArray = odSurveyHelpers.getSegmentsArray({ trip });

        const isFirst: boolean = segmentsArray[0] === segment;

        return [modePre === 'transit' && isFirst && mode !== 'paratransit', modePre];
    },
    validations: function (value, customValue, interview, path, customPath) {
        return [
            {
                validation: _isBlank(value),
                errorMessage: {
                    fr: 'Le mode de transport est requis.',
                    en: 'Mode of transport is required.'
                }
            }
        ];
    }
};

export const tripJunctionGeography: WidgetConfig.InputMapFindPlaceType = {
    type: 'question',
    inputType: 'mapFindPlace',
    path: 'junctionGeography',
    datatype: 'geojson',
    containsHtml: true,
    height: '32rem',
    refreshGeocodingLabel: {
        fr: 'Chercher le lieu de jonction à partir du nom ou de l\'adresse',
        en: 'Search the junction location using the place name or address'
    },
    autoConfirmIfSingleResult: true,
    label: (t: TFunction) => t('segments:junctionGeography'),
    icon: {
        url: (interview, path) => '/dist/icons/interface/markers/marker_round_with_small_circle_selected.svg',
        size: [35, 35]
    },
    placesIcon: {
        url: (interview, path) => '/dist/icons/interface/markers/marker_round_with_small_circle.svg',
        size: [35, 35]
    },
    selectedIcon: {
        url: (interview, path) => '/dist/icons/interface/markers/marker_round_with_small_circle_selected.svg',
        size: [35, 35]
    },
    defaultCenter: function (interview, path) {
        const person = odSurveyHelpers.getActivePerson({ interview });
        const trip = odSurveyHelpers.getActiveTrip({ interview });
        const journey = odSurveyHelpers.getActiveJourney({ interview });
        const visitedPlaces = odSurveyHelpers.getVisitedPlaces({ journey });
        const originVisitedPlace = odSurveyHelpers.getOrigin({ trip, visitedPlaces });
        if (originVisitedPlace) {
            const originGeography = odSurveyHelpers.getVisitedPlaceGeography({
                visitedPlace: originVisitedPlace,
                person,
                interview
            });
            const originCoordinates = _get(originGeography, 'geometry.coordinates', null);
            if (originCoordinates) {
                return {
                    lat: originCoordinates[1],
                    lon: originCoordinates[0]
                };
            }
        }
        return config.mapDefaultCenter;
    },
    geocodingQueryString: function (interview, path) {
        return formatGeocodingQueryStringFromMultipleFields([
            getResponse(interview, path, null, '../tripJunctionQueryString')
        ]);
    },
    defaultValue: function (interview, path) {
        return undefined;
    },
    resetToDefaultUnlessUserInteracted: true,
    conditional: function (interview, path) {
        const trip = odSurveyHelpers.getActiveTrip({ interview });
        if (trip) {
            const journey = odSurveyHelpers.getActiveJourney({ interview });
            const visitedPlaces = odSurveyHelpers.getVisitedPlaces({ journey });
            const destination = odSurveyHelpers.getDestination({ trip, visitedPlaces });
            const activity = destination ? destination.activity : null;
            const segments = odSurveyHelpers.getSegmentsArray({ trip });
            const currentSegment: any = getResponse(interview, path, undefined, '../');
            const segmentIndex = segments.findIndex((segment) => segment._sequence === currentSegment?._sequence);
            if (segmentIndex === undefined || segmentIndex === 0) {
                return [false, null];
            }
            const previousSegment = segments[segmentIndex - 1];
            return [shouldDisplayTripJunction(previousSegment, currentSegment, activity), null];
        }
        return [false, null];
    },
    validations: function (value, customValue, interview, path, customPath) {
        const person = odSurveyHelpers.getActivePerson({ interview });
        if (odSurveyHelpers.isSelfDeclared({ person, interview })) {
            return [
                {
                    validation: _isBlank(value),
                    errorMessage: {
                        fr: 'Cette réponse est requise.',
                        en: 'This field is required.'
                    }
                },
                ...inaccessibleZoneGeographyCustomValidation(value, undefined, interview, path)
            ];
        } else {
            // accept blank if proxy:
            return [];
        }
    }
};

export const segmentBusLines: WidgetConfig.InputMultiselectType = {
    type: 'question',
    path: 'busLines',
    inputType: 'multiselect',
    multiple: true,
    datatype: 'string',
    twoColumns: false,
    containsHtml: true,
    shortcuts: [
        {
            value: 'other',
            label: (t: TFunction) => t('segments:busLinesOther'),
            color: 'grey'
        },
        {
            value: 'dontKnow',
            label: (t: TFunction) => t('segments:busLinesDontKnow'),
            color: 'grey'
        }
    ],
    choices: function (interview, path) {
        // Put possibles lines at the top of the choices
        const lineSummary: any = getResponse(interview, path, undefined, '../trRoutingResult');
        const lines = lineSummary?.lines || [];
        const busRoutesFeatures = busRoutes.features;
        const choices: any[] = busRoutesFeatures.map((busRoute: any) => {
            const busRouteName = busRoute.properties.name;
            const altLine = lines.find(
                (line) =>
                    busRoute.properties.agencyId === line.agencyAcronym &&
                    busRoute.properties.shortname === line.lineShortname
            );
            return {
                value: busRoute.properties.slug,
                color: busRoute.properties.color,
                label: {
                    fr: busRouteName,
                    en: busRouteName
                },
                altCount: altLine === undefined ? 0 : altLine.alternativeCount
            };
        });
        choices.sort((lineA, lineB) => {
            // Bigger value is better
            return lineB.altCount - lineA.altCount;
        });
        choices.push({
            value: 'other',
            color: '#666666',
            sortableName: 'zother',
            label: (t: TFunction) => t('segments:busLinesOther')
        });
        choices.push({
            value: 'dontKnow',
            color: '#666666',
            sortableName: 'zdontknow',
            label: (t: TFunction) => t('segments:busLinesDontKnow')
        });
        return choices;
    },
    label: (t: TFunction, interview, path) => {
        const person = odSurveyHelpers.getPerson({ interview });
        const nickname = _escape(person.nickname);
        return t('segments:busLines', {
            nickname,
            count: odSurveyHelpers.getCountOrSelfDeclared({ interview, person })
        });
    },
    conditional: function (interview, path) {
        const mode = getResponse(interview, path, null, '../mode');
        if (mode !== 'transitBus' || busRoutes.features.length === 0) {
            return [false, null];
        }
        const journey = odSurveyHelpers.getActiveJourney({ interview });
        const trip = odSurveyHelpers.getActiveTrip({ interview });
        const visitedPlaces = odSurveyHelpers.getVisitedPlaces({ journey });
        const destination = odSurveyHelpers.getDestination({ trip, visitedPlaces });
        const activity = destination ? destination.activity : null;
        return [!loopActivities.includes(activity), null];
    },
    validations: function (value, customValue, interview, path, customPath) {
        const person = odSurveyHelpers.getPerson({ interview });
        if (odSurveyHelpers.isSelfDeclared({ person, interview })) {
            return validations.requiredValidation(value, customValue, interview, path, customPath);
        } else {
            // accept blank if proxy:
            return [];
        }
    }
};

export const segmentBusLinesWarning: WidgetConfig.InputButtonType = {
    type: 'question',
    path: 'busLinesWarning',
    inputType: 'button',
    twoColumns: false,
    containsHtml: true,
    choices: function (interview, path) {
        return [
            {
                value: 'ok',
                color: 'grey',
                size: 'medium',
                label: (t) => t('segments:busLinesAreCorrect')
            }
        ];
    },
    label: (t) => t('segments:busLinesWarning'),
    conditional: function (interview, path) {
        const segmentMode = getResponse(interview, path, undefined, '../mode');
        const segmentBuses: any = getResponse(interview, path, undefined, `../${segmentBusLines.path}`);
        if (segmentMode !== 'transitBus' || _isBlank(segmentBuses)) {
            return [false, null];
        }
        const lineSummary: any = getResponse(interview, path, undefined, '../trRoutingResult');
        let hasImpossibleLine = false;
        if (lineSummary !== undefined) {
            const lines = lineSummary.lines || [];
            const busRoutesFeatures = busRoutes.features;
            const declaredBusRoutes = busRoutesFeatures.filter((busRoute) =>
                segmentBuses.includes(busRoute.properties.slug)
            );
            const impossibleBusRoutes = declaredBusRoutes.filter(
                (busRoute) =>
                    lines.find(
                        (line) =>
                            busRoute.properties.agencyId === line.agencyAcronym &&
                            busRoute.properties.shortname === line.lineShortname
                    ) === undefined
            );
            hasImpossibleLine = impossibleBusRoutes.length !== 0;
        }
        return [hasImpossibleLine, null];
    },
    validations: function (value, customValue, interview, path, customPath) {
        return [
            {
                validation: _isBlank(value),
                errorMessage: (t: TFunction) => t('segments:busLinesWarningRequired')
            }
        ];
    }
};
