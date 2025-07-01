import { validateAccessCode, registerAccessCodeValidationFunction } from 'evolution-backend/lib/services/accessCode';

// Access code is 4 digits, dash, 4 digits
registerAccessCodeValidationFunction((accessCode) => accessCode.match(/^\d{4}-? *\d{4}$/gi) !== null);

export default {
    accessCode: {
        validations: [
            {
                validation: (value) => typeof value === 'string' && !validateAccessCode(value),
                // FIXME Server side translations are not as fully integrated as client side with i18next, so we keep hard-coded error messages for now. See https://github.com/chairemobilite/evolution/issues/1061
                errorMessage: {
                    fr: 'Code d\'accès invalide.',
                    en: 'Invalid access code.'
                }
            }
        ]
    }
};
