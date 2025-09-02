import { booleanPointInPolygon as turfBooleanPointInPolygon } from '@turf/turf';
import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import { type ValidationFunction } from 'evolution-common/lib/services/questionnaire/types';
import { requiredValidation } from 'evolution-common/lib/services/widgets/validations/validations';
import * as surveyHelperNew from 'evolution-common/lib/utils/helpers';
import { phoneValidation, emailValidation } from 'evolution-common/lib/services/widgets/validations/validations';
import { TFunction } from 'i18next';
// FIXME Find a way to parameterize the inaccessible zones
import inaccessibleZones from '../geojson/inaccessibleZones.json';
import quebecWaterWays from '../geojson/quebecWaterWaysSimplified.json';

// Check if email or phone number is provided
const emailOrPhoneNumberRequiredValidation = ({ contactEmail, phoneNumber }) => {
    return [
        {
            validation: _isBlank(contactEmail) && _isBlank(phoneNumber),
            errorMessage: {
                fr: 'L\'adresse courriel ou le numéro de téléphone est requis.',
                en: 'Email address or phone number is required.'
            }
        }
    ];
};

// Return the email validation (with email or phone number required).
// Cannot use the builtin `emailValidation` as the validation implies the field is required.
export const emailOptionalCustomValidation: ValidationFunction = (value, customValue, interview, path) => {
    const contactEmail = value;
    const phoneNumber = surveyHelperNew.getResponse(interview, 'phoneNumber', null);
    const emailOrPhoneNumberRequired = emailOrPhoneNumberRequiredValidation({ contactEmail, phoneNumber }); // Check if email or phone number is provided

    // Validate email format
    const emailValidationMessages = [
        {
            validation:
                !_isBlank(value) &&
                !/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(
                    String(value)
                ),
            errorMessage: {
                fr: 'Le courriel est invalide.',
                en: 'Email is invalid'
            }
        }
    ];

    return [...emailOrPhoneNumberRequired, ...emailValidationMessages];
};

// Return the phone validation (with email or phone number required).
// Cannot use the builtin `phoneValidation` as the validation doesn't check the contact email.
export const phoneOptionalCustomValidation: ValidationFunction = (value, customValue, interview, path) => {
    const contactEmail = surveyHelperNew.getResponse(interview, 'contactEmail', null);
    const phoneNumber = value;
    const phoneValidationMessages = phoneValidation(value, customValue, interview, path); // Get the phone validation messages
    const emailOrPhoneNumberRequired = emailOrPhoneNumberRequiredValidation({ contactEmail, phoneNumber }); // Check if email or phone number is provided

    return [...emailOrPhoneNumberRequired, ...phoneValidationMessages];
};

// Return the validations for the geography
export const getGeographyCustomValidation = ({ value, interview, path }) => {
    const geography: any = surveyHelperNew.getResponse(interview, path, null);
    const geocodingTextInput = geography ? geography.properties?.geocodingQueryString : undefined;

    return [
        {
            validation: _isBlank(value),
            errorMessage: {
                fr: 'Le positionnement du lieu est requis.',
                en: 'Positioning of the place is required.'
            }
        },
        {
            validation:
                geography &&
                geography.properties.lastAction &&
                (geography.properties.lastAction === 'mapClicked' ||
                    geography.properties.lastAction === 'markerDragged') &&
                geography.properties.zoom < 15,
            errorMessage: {
                fr: 'Le positionnement du lieu n\'est pas assez précis. Utilisez le zoom + pour vous rapprocher davantage, puis précisez la localisation en déplaçant l\'icône.',
                en: 'The positioning of the place is not precise enough. Please use the + zoom and drag the icon marker to confirm the precise location.'
            }
        },
        {
            validation: geography && geography.properties.isGeocodingImprecise,
            errorMessage: {
                fr: `<strong>Le nom du lieu utilisé pour effectuer la recherche ${
                    !_isBlank(geocodingTextInput) ? `("${geocodingTextInput}")` : ''
                } n'est pas assez précis.</strong> Ajoutez de l'information ou précisez l'emplacement à l'aide de la carte.`,
                en: `<strong>The location name used for searching ${
                    !_isBlank(geocodingTextInput) ? `("${geocodingTextInput}")` : ''
                } is not specific enough.</strong> Please add more information or specify the location more precisely using the map.`
            }
        },
        ...inaccessibleZoneGeographyCustomValidation(geography, undefined, interview, path)
    ];
};

export const householdElectricCarCountCustomValidation: ValidationFunction = (value, _customValue, interview) => {
    const carNumber = surveyHelperNew.getResponse(interview, 'household.carNumber', 0) as any;
    const pluginHybridCarNumber = surveyHelperNew.getResponse(interview, 'household.pluginHybridCarNumber', 0) as any;
    return [
        {
            validation:
                !_isBlank(value) &&
                (typeof value === 'string' ? parseInt(value) : value) + pluginHybridCarNumber > carNumber,
            errorMessage: (t: TFunction) => t('customLabel:HybridElectricExceedsTotal')
        }
    ];
};

export const householdHybridCarCountCustomValidation = (value, _customValue, interview) => {
    const carNumber = surveyHelperNew.getResponse(interview, 'household.carNumber', 0) as number;
    const electricCarNumber = surveyHelperNew.getResponse(interview, 'household.electricCarNumber', 0) as number;
    return [
        {
            validation:
                !_isBlank(value) &&
                (typeof value === 'string' ? parseInt(value) : value) + electricCarNumber > carNumber,
            errorMessage: (t: TFunction) => t('customLabel:HybridElectricExceedsTotal')
        }
    ];
};

export const transitFareCustomValidation = (value, customValue, interview, path, customPath, user) => [
    ...requiredValidation(value, customValue, interview, path, customPath, user),
    {
        validation: !_isBlank(value) && value.length && value.length > 1 && value.includes('dontKnow'),
        errorMessage: (t) => t('household:errors.selectDontKnowWhenNoOtherChoiceSelected')
    },
    {
        validation: !_isBlank(value) && value.length && value.length > 1 && value.includes('no'),
        errorMessage: (t) => t('household:errors.selectNoWhenNoOtherChoiceSelected')
    }
];

const oneOrMoreAndPreferNotToAnswerValidation = (value) => [
    {
        validation: _isBlank(value) || !value.length || value.length < 1,
        errorMessage: (t) => t('household:errors.selectOneOrMoreAnswer')
    },
    {
        validation: !_isBlank(value) && value.length > 1 && value.includes('preferNotToAnswer'),
        errorMessage: (t) => t('household:errors.selectPreferNotToAnswerWhenNoOtherChoiceSelected')
    }
];

export const travelToPlaceCustomValidation = (value) => [
    ...oneOrMoreAndPreferNotToAnswerValidation(value),
    {
        validation: !_isBlank(value) && value.length > 1 && value.includes('no'),
        errorMessage: (t) => t('household:errors.selectNoTravelWhenNoOtherChoiceSelected')
    }
];

export const remoteWorkDaysCustomValidation = (value) => [
    ...oneOrMoreAndPreferNotToAnswerValidation(value),
    {
        validation: !_isBlank(value) && value.length > 1 && value.includes('no'),
        errorMessage: (t) => t('household:errors.selectNoRemoteWorkWhenNoOtherChoiceSelected')
    }
];

// FIXME Cannot use the builtin `inputRangeValidation` as the validation implies the field is required. This is for optional range inputs.
export const rangeOptionalOrValidCustomValidation = (value) => {
    return [
        {
            // Check if the value is set and less than 0
            validation: !_isBlank(value) && !(Number(value) >= 0),
            errorMessage: (t) => t('end:errors.inputRangeMustBePositiveOrZero')
        }
    ];
};

export const inaccessibleZoneGeographyCustomValidation: ValidationFunction = (geography) => {
    return [
        {
            validation:
                geography &&
                (turfBooleanPointInPolygon(
                    geography as any,
                    inaccessibleZones.features[0] as GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>
                ) ||
                    turfBooleanPointInPolygon(
                        geography as any,
                        quebecWaterWays.features[0] as GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>
                    )),
            errorMessage: (t: TFunction) => t('survey:visitedPlace:locationIsNotAccessibleError')
        }
    ];
};
