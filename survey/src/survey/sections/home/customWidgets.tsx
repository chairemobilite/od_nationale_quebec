import { TFunction } from 'i18next';
import config from 'chaire-lib-common/lib/config/shared/project.config';
import * as defaultInputBase from 'evolution-frontend/lib/components/inputs/defaultInputBase';
import { getFormattedDate } from 'evolution-frontend/lib/services/display/frontendHelper';
import * as WidgetConfig from 'evolution-common/lib/services/questionnaire/types';
import { getActivityMarkerIcon } from 'evolution-common/lib/services/questionnaire/sections/visitedPlaces/activityIconMapping';
import * as surveyHelperNew from 'evolution-common/lib/utils/helpers';
import { defaultConditional } from 'evolution-common/lib/services/widgets/conditionals/defaultConditional';
import * as validations from 'evolution-common/lib/services/widgets/validations/validations';
import * as customValidations from '../../common/customValidations';
import { defaultInvalidGeocodingResultTypes } from '../../common/customGeoData';
import * as customHelpPopup from '../../common/customHelpPopup';

export const household_size: WidgetConfig.InputRadioNumberType = {
    ...defaultInputBase.inputRadioNumberBase,
    path: 'household.size',
    twoColumns: false,
    containsHtml: true,
    label: (t: TFunction, interview) => {
        const assignedDay = surveyHelperNew.getResponse(interview, '_assignedDay') as string;
        const assignedDate = getFormattedDate(assignedDay, { withDayOfWeek: true, withRelative: true });

        return t('home:household.size', {
            assignedDate
        });
    },
    valueRange: {
        min: 1,
        max: 6
    },
    overMaxAllowed: true,
    helpPopup: customHelpPopup.householdSizeHelpPopup,
    conditional: defaultConditional,
    validations: validations.householdSizeValidation
};

export const home_geography: WidgetConfig.InputMapFindPlaceType = {
    ...defaultInputBase.inputMapFindPlaceBase,
    path: 'home.geography',
    label: (t: TFunction, _interview, _path) => {
        return t('home:home.geography');
    },
    icon: {
        url: getActivityMarkerIcon('home'),
        size: [70, 70]
    },
    geocodingQueryString: (interview) => {
        // TODO: Add country and region to the geocoding query string
        const city = surveyHelperNew.getResponse(interview, 'home.city', null);
        const address = surveyHelperNew.getResponse(interview, 'home.address', null);
        const postalCode = surveyHelperNew.getResponse(interview, 'home.postalCode', null);

        // Fields to use for geocoding
        const fieldsAddress = [];
        // Postal code is optional
        if (postalCode !== null) {
            fieldsAddress.push(postalCode);
        }
        fieldsAddress.push(city, address);

        return [{ queryString: surveyHelperNew.formatGeocodingQueryStringFromMultipleFields(fieldsAddress), zoom: 16 }];
    },
    defaultCenter: config.mapDefaultCenter,
    defaultZoom: config.mapDefaultZoom,
    invalidGeocodingResultTypes: defaultInvalidGeocodingResultTypes,
    validations: (value, _customValue, interview, path) =>
        customValidations.getGeographyCustomValidation({
            value,
            interview,
            path
        })
    // conditional: conditionals.homeGeographyConditional
};
