import { _isBlank, _booleish } from 'chaire-lib-common/lib/utils/LodashExtensions';
import { validateAccessCode } from 'evolution-backend/lib/services/accessCode';
import { getResponse } from 'evolution-common/lib/utils/helpers';
import { getPreFilledResponseByPath } from 'evolution-backend/lib/services/interviews/serverFieldUpdate';
import { formatAccessCode } from '../common/helper';

const HOME_ADDRESS_KEY = 'home.address';
const HOME_ADDRESS_IS_PREFILLED_KEY = 'home._addressIsPrefilled';
const getPrefilledForAccessCode = async (accessCode, interview) => {
    const prefilledResponses = await getPreFilledResponseByPath(accessCode, interview);
    if (prefilledResponses[HOME_ADDRESS_KEY] !== undefined) {
        prefilledResponses[HOME_ADDRESS_IS_PREFILLED_KEY] = true;
    }
    return prefilledResponses;
};

export default [
    {
        field: 'accessCode',
        callback: async (interview, value) => {
            try {
                const properlyFormattedAccessCode = typeof value === 'string' ? formatAccessCode(value) : value;
                // Only valid access codes should be processed
                if (_isBlank(value) || !validateAccessCode(properlyFormattedAccessCode)) {
                    return {};
                }
                // To avoid multiple changes to the access code, we check if it has already been confirmed, if so, simply return.
                const accessCodeConfirmed = getResponse(interview, 'accessCodeConfirmed', false);
                if (accessCodeConfirmed) {
                    return {};
                }

                // Get prefilled responses for this access code
                const prefilledResponses = await getPrefilledForAccessCode(properlyFormattedAccessCode, interview);
                if (properlyFormattedAccessCode !== value) {
                    prefilledResponses['accessCode'] = properlyFormattedAccessCode;
                }
                // Set the access code as confirmed
                prefilledResponses['accessCodeConfirmed'] = true;
                return prefilledResponses;
            } catch (error) {
                console.error('error getting server update fields for accessCode', error);
                return {};
            }
        }
    }
];
