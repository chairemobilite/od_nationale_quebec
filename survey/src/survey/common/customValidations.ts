import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import { type ValidationFunction } from 'evolution-common/lib/services/questionnaire/types';
import * as surveyHelperNew from 'evolution-common/lib/utils/helpers';
import { TFunction } from 'i18next';

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
                geography.properties.zoom < 14,
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
        }
    ];
};

export const householdElectricCarCountCustomValidation: ValidationFunction = (value, _customValue, interview) => {
    const carNumber = surveyHelperNew.getResponse(interview, 'household.carNumber', 0) as any;
    const electricCarNumber = surveyHelperNew.getResponse(interview, 'household.hybridCarNumber', 0) as any;
    return [
        {
            validation:
                !_isBlank(value) &&
                (typeof value === 'string' ? parseInt(value) : value) + electricCarNumber > carNumber,
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
