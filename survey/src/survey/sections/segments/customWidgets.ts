import _get from 'lodash/get';
import _truncate from 'lodash/truncate';
import _max from 'lodash/max';
import _min from 'lodash/min';
import { booleanPointInPolygon as turfBooleanPointInPolygon } from '@turf/turf';
import config from 'evolution-common/lib/config/project.config';
import * as WidgetConfig from 'evolution-common/lib/services/questionnaire/types';
import * as odSurveyHelpers from 'evolution-common/lib/services/odSurvey/helpers';
import * as validations from 'evolution-common/lib/services/widgets/validations/validations';
import { getSwitchPersonWidgets } from 'evolution-common/lib/services/questionnaire/sections/common/widgetsSwitchPerson';
import { getPersonsTripsTitleWidgetConfig } from 'evolution-common/lib/services/questionnaire/sections/segments/widgetPersonTripsTitle';
import { TFunction } from 'i18next';
import {
    addGroupedObjects,
    formatGeocodingQueryStringFromMultipleFields,
    getPath,
    getResponse
} from 'evolution-common/lib/utils/helpers';
import {
    getFormattedDate,
    getVisitedPlaceDescription,
    validateButtonAction,
    validateButtonActionWithCompleteSection
} from 'evolution-frontend/lib/services/display/frontendHelper';
import { getPersonVisitedPlacesMapConfig } from 'evolution-common/lib/services/questionnaire/sections/common/widgetPersonVisitedPlacesMap';
import { getPersonsTripsGroupConfig } from 'evolution-common/lib/services/questionnaire/sections/segments/groupPersonTrips';
import { getTripSegmentsIntro } from 'evolution-common/lib/services/questionnaire/sections/segments/widgetTripSegmentsIntro';
import { getSegmentsGroupConfig } from 'evolution-common/lib/services/questionnaire/sections/segments/groupSegments';
import { getSameAsReverseTripWidgetConfig } from 'evolution-common/lib/services/questionnaire/sections/segments/widgetSameAsReverseTrip';
import { getModePreWidgetConfig } from 'evolution-common/lib/services/questionnaire/sections/segments/widgetSegmentModePre';
import { getModeWidgetConfig } from 'evolution-common/lib/services/questionnaire/sections/segments/widgetSegmentMode';
import { getSegmentHasNextModeWidgetConfig } from 'evolution-common/lib/services/questionnaire/sections/segments/widgetSegmentHasNextMode';
import { getButtonSaveTripSegmentsConfig } from 'evolution-common/lib/services/questionnaire/sections/segments/buttonSaveTripSegments';
import { getButtonValidateAndGotoNextSection } from 'evolution-common/lib/services/questionnaire/sections/common/buttonValidateAndGotoNextSection';
import {
    getPreviousTripSingleSegment,
    shouldShowSameAsReverseTripQuestion
} from 'evolution-common/lib/services/questionnaire/sections/segments/helpers';
import {
    isStudent,
    isStudentFromEnrolled,
    carsharingMembersCountInHousehold,
    getShortcutVisitedPlaceName,
    getShortcutVisitedPlacePerson,
    formatTripDuration,
    getHomeAddressOneLine,
    selectNextIncompleteVisitedPlace,
    deleteVisitedPlace,
    getBirdDistanceMeters,
    getCurrentTripBirdDistanceMeters,
    getDrivers,
    shouldDisplayTripJunction
} from '../../common/helper';
import { _booleish, _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import i18n from 'evolution-frontend/lib/config/i18n.config';
import { loopActivities } from 'evolution-common/lib/services/odSurvey/types';
// FIXME Find a way to parameterize the inaccessible zones
import inaccessibleZones from '../../geojson/inaccessibleZones.json';
import { faCheckCircle, faTrashAlt } from '@fortawesome/free-solid-svg-icons';
import { getShortcutVisitedPlaces } from '../../common/customFrontendHelper';
import { buttonNextBase } from 'evolution-frontend/lib/components/inputs/defaultInputBase';
import { isLastPlaceCustomConditional } from '../../common/customConditionals';
import { personVisitedPlacesMap as visitedPlacesMap } from '../visitedPlaces/customWidgets';
import { personTripsWidgetsNames, segmentsWidgetsNames } from './widgetsNames';
import { getModeIcon } from 'evolution-common/lib/services/questionnaire/sections/segments/modeIconMapping';

const switchPersonWidgets = getSwitchPersonWidgets();

export const activePersonTitle: WidgetConfig.TextWidgetConfig = switchPersonWidgets.activePersonTitle;

export const buttonSwitchPerson: WidgetConfig.ButtonWidgetConfig = switchPersonWidgets.buttonSwitchPerson;

export const segmentsPersonTripsTitle: WidgetConfig.TextWidgetConfig = getPersonsTripsTitleWidgetConfig({
    getFormattedDate
});

// FIXME This is the exact same widget, same name as the one in visitedPlaces, we should not have to duplicate it, but that's how the generator currently works
export const personVisitedPlacesMap: WidgetConfig.InfoMapWidgetConfig = visitedPlacesMap;

export const personTrips: WidgetConfig.GroupConfig = {
    ...getPersonsTripsGroupConfig(),
    widgets: personTripsWidgetsNames
};

export const segmentIntro: WidgetConfig.TextWidgetConfig = getTripSegmentsIntro();

export const segments: WidgetConfig.GroupConfig = {
    ...getSegmentsGroupConfig(),
    widgets: segmentsWidgetsNames
};

export const segmentSameModeAsReverseTrip = getSameAsReverseTripWidgetConfig();

export const segmentModePre = {
    ...getModePreWidgetConfig(),
    choices: [
        {
            value: 'carDriver',
            label: {
                fr: '<strong>Conducteur</strong> (voiture/moto/scooter)',
                en: '<strong>Driver</strong> (car/motorcycle/moped)'
            },
            conditional: function (interview, path) {
                const person = odSurveyHelpers.getActivePerson({ interview });
                const drivingLicenseOwnership = person ? person.drivingLicenseOwnership : 'dontKnow';
                return drivingLicenseOwnership === 'yes';
            },
            iconPath: getModeIcon('carDriver')
        },
        {
            value: 'carPassenger',
            label: {
                fr: '<strong>Passager</strong> (voiture/moto/scooter)',
                en: '<strong>Passenger (car/motorcycle/moped)</strong>'
            },
            iconPath: getModeIcon('carPassenger')
        },
        {
            value: 'walk',
            label: {
                fr: '<strong>Marche</strong>',
                en: '<strong>Walking</strong>'
            },
            iconPath: getModeIcon('walk')
        },
        {
            value: 'wheelchair',
            label: {
                fr: '<strong>Chaise roulante</strong>',
                en: '<strong>Wheelchair</strong>'
            },
            conditional: function (interview, path) {
                const person = odSurveyHelpers.getActivePerson({ interview });
                return person && odSurveyHelpers.personMayHaveDisability({ person });
            },
            iconPath: getModeIcon('wheelchair')
        },
        {
            value: 'mobilityScooter',
            label: {
                fr: '<strong>Quadriporteur/Triporteur</strong>',
                en: '<strong>Mobility scooter</strong>'
            },
            conditional: function (interview, path) {
                const person = odSurveyHelpers.getActivePerson({ interview });
                return person && odSurveyHelpers.personMayHaveDisability({ person });
            },
            iconPath: getModeIcon('mobilityScooter')
        },
        {
            value: 'paratransit',
            label: {
                fr: '<strong>Transport adapté</strong>',
                en: '<strong>Paratransit</strong>'
            },
            iconPath: getModeIcon('paratransit'),
            conditional: function (interview, path) {
                const person = odSurveyHelpers.getActivePerson({ interview });
                // paratransit can be used by an accompanying person too, so show this mode for any household with at least one person with disability:
                return (
                    (person && odSurveyHelpers.personMayHaveDisability({ person })) ||
                    odSurveyHelpers.householdMayHaveDisability({ interview })
                );
            }
        },
        {
            value: 'bicycle',
            label: {
                fr: '<strong>Vélo</strong> ou <strong> vélo électrique</strong>',
                en: '<strong>Bicycle</strong> or <strong>electric bicycle</strong>'
            },
            iconPath: getModeIcon('bicycle')
        },
        {
            value: 'transit',
            label: {
                fr: '<strong>Transport collectif</strong>',
                en: '<strong>Public transit</strong>'
            },
            iconPath: getModeIcon('transitBus')
        },
        {
            value: 'taxi',
            label: {
                fr: '<strong>Taxi</strong> ou équivalent (ex. Uber)',
                en: '<strong>Taxi</strong> or equivalent (eg. Uber)'
            },
            iconPath: getModeIcon('taxi')
        },
        {
            value: 'ferry',
            label: {
                fr: '<strong>Traversier</strong>',
                en: '<strong>Ferry</strong>'
            },
            iconPath: getModeIcon('transitFerry')
        },
        {
            value: 'other',
            label: {
                fr: '<strong>Autre</strong>',
                en: '<strong>Other</strong>'
            },
            iconPath: getModeIcon('other')
        },
        {
            value: 'dontKnow',
            label: {
                fr: '<strong>Je ne sais pas</strong> / Préfère ne pas répondre',
                en: '<strong>I don\'t know</strong> / Prefer not to answer'
            },
            iconPath: getModeIcon('dontKnow')
        }
    ]
};

const segmentModeChoices: WidgetConfig.RadioChoiceType[] = [
    {
        value: 'bicycle',
        label: {
            fr: '<strong>Vélo</strong>',
            en: '<strong>Bicycle</strong>'
        },
        conditional: function (interview, path) {
            const segment: any = getResponse(interview, path, null, '../');
            const modePre = segment ? segment.modePre : null;
            return modePre === 'bicycle';
        },
        iconPath: getModeIcon('bicycle')
    },
    {
        value: 'bicycleElectric',
        label: {
            fr: '<strong>Vélo électrique</strong>',
            en: '<strong>E-Bike</strong> (electric bicycle)'
        },
        conditional: function (interview, path) {
            const segment: any = getResponse(interview, path, null, '../');
            const modePre = segment ? segment.modePre : null;
            const person = odSurveyHelpers.getActivePerson({ interview });
            return modePre === 'bicycle' && person && !_isBlank(person.age) && person.age >= 14;
        },
        // FIXME In Evolution, the bicycleElectric mode was meant to be an extra
        // question, with `bicycle` as mode and use the `BicycleType` to answer
        // the new question. In this survey, it is still a mode, so we manually
        // set the icon path for it.
        iconPath: '/dist/icons/modes/bicycle/bicycle_without_rider_electric.svg'
    },
    {
        value: 'scooterElectric',
        label: {
            fr: '<strong>Trottinette électrique</strong>',
            en: '<strong>E-Scooter</strong> (electric scooter)'
        },
        conditional: function (interview, path) {
            const segment: any = getResponse(interview, path, null, '../');
            const modePre = segment ? segment.modePre : null;
            const person = odSurveyHelpers.getActivePerson({ interview });
            return (
                (modePre === 'bicycle' || modePre === 'other') && person && !_isBlank(person.age) && person.age >= 14
            );
        },
        iconPath: getModeIcon('scooterElectric')
    },
    {
        value: 'mobilityScooter',
        label: {
            fr: '<strong>Quadriporteur/triporteur</strong>',
            en: '<strong>Mobility scooter</strong>'
        },
        conditional: function (interview, path) {
            const segment: any = getResponse(interview, path, null, '../');
            const modePre = segment ? segment.modePre : null;
            return modePre === 'mobilityScooter' || modePre === 'other';
        },
        iconPath: getModeIcon('mobilityScooter')
    },
    {
        value: 'wheelchair',
        label: {
            fr: '<strong>Chaise roulante</strong>',
            en: '<strong>Wheelchair</strong>'
        },
        conditional: function (interview, path) {
            const segment: any = getResponse(interview, path, null, '../');
            const modePre = segment ? segment.modePre : null;
            return modePre === 'wheelchair';
        },
        iconPath: getModeIcon('wheelchair')
    },
    {
        value: 'transitBus',
        label: {
            fr: '<strong>Bus</strong> (transport collectif)',
            en: '<strong>Bus</strong> (public transit)'
        },
        conditional: function (interview, path) {
            const segment: any = getResponse(interview, path, null, '../');
            const modePre = segment ? segment.modePre : null;
            return modePre === 'transit';
        },
        iconPath: getModeIcon('transitBus')
    },
    {
        value: 'transitSubway',
        label: {
            fr: '<strong>Métro<strong>',
            en: '<strong>Metro<strong> (subway)'
        },
        conditional: function (interview, path) {
            const segment: any = getResponse(interview, path, null, '../');
            const modePre = segment ? segment.modePre : null;
            return modePre === 'transit';
        },
        iconPath: getModeIcon('transitRRT')
    },
    {
        value: 'transitREM',
        label: {
            fr: '<strong>REM</strong>',
            en: '<strong>REM</strong>'
        },
        conditional: function (interview, path) {
            const segment: any = getResponse(interview, path, null, '../');
            const modePre = segment ? segment.modePre : null;
            return modePre === 'transit';
        },
        iconPath: getModeIcon('transitLRT')
    },
    {
        value: 'transitRail',
        label: {
            fr: '<strong>Train de banlieue</strong> (exo)',
            en: '<strong>Commuter train</strong> (exo)'
        },
        conditional: function (interview, path) {
            const segment: any = getResponse(interview, path, null, '../');
            const modePre = segment ? segment.modePre : null;
            return modePre === 'transit';
        },
        iconPath: getModeIcon('transitRegionalRail')
    },
    {
        value: 'transitTram',
        label: {
            fr: '<strong>Tramway</strong>',
            en: '<strong>Tram</strong>'
        },
        conditional: function (interview, path) {
            const segment: any = getResponse(interview, path, null, '../');
            const modePre = segment ? segment.modePre : null;
            return modePre === 'transit';
        },
        iconPath: getModeIcon('transitStreetCar')
    },
    {
        value: 'transitTaxi',
        label: {
            fr: '<strong>Taxi collectif</strong> / Transport à la demande',
            en: '<strong>Taxibus</strong> / On-demand transport'
        },
        conditional: function (interview, path) {
            const segment: any = getResponse(interview, path, null, '../');
            const modePre = segment ? segment.modePre : null;
            return modePre === 'other' || modePre === 'transit';
        },
        iconPath: getModeIcon('transitTaxi')
    },
    {
        value: 'intercityBus',
        label: {
            fr: '<strong>Bus interurbain</strong> (Orléans, Kéolis, etc.)',
            en: '<strong>Intercity bus</strong> (Orleans, Keolis, etc.)'
        },
        conditional: function (interview, path) {
            const segment: any = getResponse(interview, path, null, '../');
            const tripDistanceMeters = getCurrentTripBirdDistanceMeters({ interview });
            const modePre = segment ? segment.modePre : null;
            return (
                ['transit', 'other'].includes(modePre) && (_isBlank(tripDistanceMeters) || tripDistanceMeters >= 50000)
            );
        },
        iconPath: getModeIcon('intercityBus')
    },
    {
        value: 'schoolBus',
        label: {
            fr: '<strong>Autobus scolaire</strong> (jaune)',
            en: '<strong>School bus</strong> (yellow)'
        },
        conditional: function (interview, path) {
            const segment: any = getResponse(interview, path, null, '../');
            const modePre = segment ? segment.modePre : null;
            const person = odSurveyHelpers.getPerson({ interview });
            return (
                ['transit', 'other'].includes(modePre) &&
                person &&
                ((person.age && person.age <= 15) || isStudent(person))
            );
        },
        iconPath: getModeIcon('schoolBus')
    },
    {
        value: 'busOther',
        label: {
            fr: '<strong>Bus nolisé</strong> ou privé',
            en: '<strong>Chartered</strong> or private <strong>bus</strong>'
        },
        conditional: function (interview, path) {
            const segment: any = getResponse(interview, path, null, '../');
            const modePre = segment ? segment.modePre : null;
            return modePre === 'transit' || modePre === 'other';
        },
        iconPath: getModeIcon('otherBus')
    },
    {
        value: 'carDriver',
        label: {
            fr: '<strong>Voiture personnelle</strong> (appartenant à soi, un.e ami.e, la famille, etc.)',
            en: '<strong>Personal car</strong> (can belong to self, friend, family, etc)'
        },
        conditional: function (interview, path) {
            const segment: any = getResponse(interview, path, null, '../');
            const modePre = segment ? segment.modePre : null;
            return modePre === 'carDriver';
        },
        iconPath: getModeIcon('carDriver')
    },
    {
        value: 'carDriverCarsharing',
        label: {
            fr: '<strong>Autopartage</strong> (ex. Communauto)',
            en: '<strong>Carsharing</strong> (ex. Communauto)'
        },
        conditional: function (interview, path) {
            const segment: any = getResponse(interview, path, null, '../');
            const modePre = segment ? segment.modePre : null;
            const carsharingMembersCount = carsharingMembersCountInHousehold(interview);
            return modePre === 'carDriver' && carsharingMembersCount > 0;
        },
        iconPath: getModeIcon('carDriver')
    },
    {
        value: 'rentalCar',
        label: {
            fr: '<strong>Voiture louée</strong> (Hertz, Enterprise, Budget, Avis, etc.)',
            en: '<strong>Rental car</strong> (Hertz, Enterprise, Budget, Avis, etc.)'
        },
        conditional: function (interview, path) {
            const segment: any = getResponse(interview, path, null, '../');
            const modePre = segment ? segment.modePre : null;
            return modePre === 'carDriver';
        },
        iconPath: getModeIcon('carDriver')
    },
    {
        value: 'motorcycle',
        label: {
            fr: '<strong>Moto</strong> (ou scooter)',
            en: '<strong>Motorcycle</strong> (or motorized scooter/moped)'
        },
        conditional: function (interview, path) {
            const segment: any = getResponse(interview, path, null, '../');
            const modePre = segment ? segment.modePre : null;
            return modePre === 'carDriver' || modePre === 'other';
        },
        iconPath: getModeIcon('motorcycle')
    },
    {
        value: 'ferryNoCar',
        label: {
            fr: '<strong>Traversier ou navette fluviale</strong> sans véhicule',
            en: '<strong>Ferry or river shuttle</strong> without vehicle'
        },
        conditional: function (interview, path) {
            const segment: any = getResponse(interview, path, null, '../');
            const modePre = segment ? segment.modePre : null;
            return modePre === 'other' || modePre === 'transit' || modePre === 'ferry';
        },
        iconPath: getModeIcon('transitFerry')
    },
    {
        value: 'ferryWithCar',
        label: {
            fr: '<strong>Traversier avec véhicule</strong>',
            en: '<strong>Ferry with vehicle</strong>'
        },
        conditional: function (interview, path) {
            const segment: any = getResponse(interview, path, null, '../');
            const modePre = segment ? segment.modePre : null;
            return modePre === 'other' || modePre === 'transit' || modePre === 'ferry';
        },
        iconPath: getModeIcon('ferryWithCar')
    },
    {
        value: 'intercityRail',
        label: {
            fr: '<strong>Train interurbain</strong> (VIA Rail)',
            en: '<strong>Intercity train</strong> (VIA Rail)'
        },
        conditional: function (interview, path) {
            const segment: any = getResponse(interview, path, null, '../');
            const tripDistanceMeters = getCurrentTripBirdDistanceMeters({ interview });
            const modePre = segment ? segment.modePre : null;
            return (
                ['transit', 'other'].includes(modePre) && (_isBlank(tripDistanceMeters) || tripDistanceMeters >= 50000)
            );
        },
        iconPath: getModeIcon('intercityTrain')
    },
    {
        value: 'carPassenger',
        label: {
            fr: '<strong>Passager</strong> (voiture/moto/scooter)',
            en: '<strong>Passenger</strong> (car/motorcycle/moped)'
        },
        conditional: function (interview, path) {
            const segment: any = getResponse(interview, path, null, '../');
            const modePre = segment ? segment.modePre : null;
            return modePre === 'carPassenger';
        },
        iconPath: getModeIcon('carPassenger')
    },
    {
        value: 'paratransit',
        label: {
            fr: '<strong>Transport adapté</strong>',
            en: '<strong>Paratransit</strong>'
        },
        conditional: function (interview, path) {
            const segment: any = getResponse(interview, path, null, '../');
            const modePre = segment ? segment.modePre : null;
            const person = odSurveyHelpers.getActivePerson({ interview });
            // paratransit can be used by an accompanying person too, so show this mode for any household with at least one person with disability:
            return (
                (['transit', 'other', 'carPassenger', 'paratransit'].includes(modePre) &&
                    person &&
                    odSurveyHelpers.personMayHaveDisability({ person })) ||
                odSurveyHelpers.householdMayHaveDisability({ interview })
            );
        },
        iconPath: getModeIcon('paratransit')
    },
    {
        value: 'plane',
        label: {
            fr: '<strong>Avion</strong>',
            en: '<strong>Airplane</strong>'
        },
        conditional: function (interview, path) {
            const segment: any = getResponse(interview, path, null, '../');
            const tripDistanceMeters = getCurrentTripBirdDistanceMeters({ interview });
            const modePre = segment ? segment.modePre : null;
            return modePre === 'other' && (_isBlank(tripDistanceMeters) || tripDistanceMeters >= 50000);
        },
        iconPath: getModeIcon('plane')
    },
    {
        value: 'other',
        label: {
            fr: '<strong>Autre</strong>',
            en: '<strong>Other</strong>'
        },
        conditional: function (interview, path) {
            const segment: any = getResponse(interview, path, null, '../');
            const modePre = segment ? segment.modePre : null;
            return modePre === 'other';
        },
        iconPath: getModeIcon('other')
    }
];

// FIXME Because of different choices, we need to overwrite the conditional as
// well, but if we could parameterize the choices, the main conditional would be
// ok
export const segmentMode = {
    ...getModeWidgetConfig(),
    choices: segmentModeChoices,
    conditional: (interview, path) => {
        const segment = getResponse(interview, path, null, '../') as WidgetConfig.Segment;
        const shouldShowSameAsReverseTrip = shouldShowSameAsReverseTripQuestion({ interview, segment });
        // Do not show if the question of the same mode as previous trip is shown and the answer is not 'no'
        if (shouldShowSameAsReverseTrip && segment.sameModeAsReverseTrip !== false) {
            if (segment.sameModeAsReverseTrip === true) {
                // If the question of the same mode as previous trip is shown and the answer is yes, the mode is the same as the previous trip
                const previousTripSegment = getPreviousTripSingleSegment({
                    interview,
                    person: odSurveyHelpers.getActivePerson({ interview })
                });
                if (previousTripSegment && previousTripSegment.mode !== undefined) {
                    return [false, previousTripSegment.mode];
                }
            }
            // Otherwise, initialize to null
            return [false, null];
        }
        // Make sure modePre is selected before displaying
        const modePre = segment ? segment.modePre : null;
        if (_isBlank(modePre)) {
            return [false, null];
        }
        // Check if there is more than one choice available for this trip
        const modes = segmentModeChoices.filter((choice) => choice.conditional(interview, path) === true);
        if (modes.length === 1 || modes.length === 0) {
            return [false, modes[0] ? modes[0].value : modePre];
        }
        return [true, null];
    }
};

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
        value: 'scooterElectric',
        label: {
            fr: '<strong>Trottinette électrique</strong>',
            en: '<strong>E-Scooter</strong> (electric scooter)'
        },
        iconPath: getModeIcon('scooterElectric')
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
            context: person.gender,
            nickname: person.nickname,
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

export const segmentDriver = {
    type: 'question',
    path: 'driver',
    inputType: 'select',
    datatype: 'string',
    twoColumns: false,
    label: (t: TFunction, interview, path) => {
        const person = odSurveyHelpers.getActivePerson({ interview });
        return t('segments:driver', {
            context: person.gender,
            count: odSurveyHelpers.getCountOrSelfDeclared({ interview, person })
        });
    },
    choices: function (interview) {
        const person = odSurveyHelpers.getActivePerson({ interview });
        const choices: any[] = [
            {
                groupShortname: '',
                groupLabel: '',
                choices: [
                    {
                        value: 'familyMember',
                        label: (t: TFunction) => t('segments:driverFamily')
                    },
                    {
                        value: 'colleague',
                        label: (t: TFunction) => t('segments:driverColleague')
                    }
                ]
            },
            {
                groupShortname: '',
                groupLabel: '',
                choices: [
                    {
                        value: 'taxiDriver',
                        label: (t: TFunction) => t('segments:driverTaxi')
                    },
                    {
                        value: 'transitTaxiDriver',
                        label: (t: TFunction) => t('segments:driverTransitTaxi')
                    },
                    {
                        value: 'paratransit',
                        label: (t: TFunction) => t('segments:driverParaTransit'),
                        conditional: function (interview, path) {
                            // paratransit can be used by an accompanying person too, so show this mode for any household with at least one person with disability:
                            return (
                                odSurveyHelpers.personMayHaveDisability({ person }) ||
                                odSurveyHelpers.householdMayHaveDisability({ interview })
                            );
                        }
                    },
                    {
                        value: 'covoiturage',
                        label: (t: TFunction) => t('segments:driverCarpool')
                    },
                    {
                        value: 'other',
                        label: (t: TFunction) => t('segments:driverOther')
                    },
                    {
                        value: 'dontKnow',
                        label: (t: TFunction) => t('segments:driverDontKnow'),
                        conditional: function (interview, path) {
                            return !odSurveyHelpers.getCountOrSelfDeclared({ interview, person });
                        }
                    }
                ]
            }
        ];
        // Ajout des personnes avec permis dans le ménage
        const drivers = getDrivers({ interview });
        const hhDrivers: { value: string; label: string | ((t: TFunction) => string) }[] = [];
        for (let i = 0, count = drivers.length; i < count; i++) {
            const driver = drivers[i];
            if (driver._uuid !== person._uuid) {
                hhDrivers.push({
                    value: driver._uuid,
                    label: !_isBlank(driver.nickname)
                        ? driver.nickname
                        : (t: TFunction) => t('segments:driverFamilyMemberSeq', { sequence: driver['_sequence'] })
                });
            }
        }
        if (hhDrivers.length > 0) {
            choices.unshift({
                groupShortname: '',
                groupLabel: '',
                choices: hhDrivers
            });
        }
        return choices;
    },
    conditional: function (interview, path) {
        const mode = getResponse(interview, path, null, '../mode');
        if (mode !== 'carPassenger') {
            return [false, null];
        }
        const trip: any = odSurveyHelpers.getActiveTrip({ interview });
        const journey = odSurveyHelpers.getActiveJourney({ interview });
        const visitedPlaces = odSurveyHelpers.getVisitedPlaces({ journey });
        const destination = odSurveyHelpers.getDestination({ visitedPlaces, trip });
        const activity = destination ? destination.activity : null;
        return [activity !== 'workOnTheRoad', null];
    },
    validations: validations.requiredValidation
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
        url: (interview, path) => '/dist/images/activities_icons/default_marker.svg',
        size: [70, 70]
    },
    placesIcon: {
        url: (interview, path) => '/dist/images/activities_icons/default_marker.svg',
        size: [70, 70]
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
    updateDefaultValueWhenResponded: true,
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
                }
            ];
        } else {
            // accept blank if proxy:
            return [];
        }
    }
};

// TODO Implement
export const segmentBusLines = null;
export const segmentBusLinesWarning = null;

export const segmentHasNextMode = getSegmentHasNextModeWidgetConfig();

export const buttonSaveTrip = getButtonSaveTripSegmentsConfig({
    iconMapper: { 'check-circle': faCheckCircle },
    buttonActions: { validateButtonAction: validateButtonAction }
});

export const buttonConfirmNextSection = getButtonValidateAndGotoNextSection('survey:ConfirmAndContinue', {
    iconMapper: { 'check-circle': faCheckCircle },
    buttonActions: {
        validateButtonAction: validateButtonActionWithCompleteSection
    }
});
