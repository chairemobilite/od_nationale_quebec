import { TFunction } from 'i18next';
import * as defaultInputBase from 'evolution-frontend/lib/components/inputs/defaultInputBase';
import { defaultConditional } from 'evolution-common/lib/services/widgets/conditionals/defaultConditional';
import * as WidgetConfig from 'evolution-common/lib/services/questionnaire/types';
import * as validations from 'evolution-common/lib/services/widgets/validations/validations';
import * as choices from '../../common/choices';

// TODO: Move this widget to Evolution (we use it often)
export const householdIncome: WidgetConfig.InputSelectType = {
    ...defaultInputBase.inputSelectBase,
    path: 'household.income',
    twoColumns: false,
    containsHtml: true,
    label: (t: TFunction) => {
        return t('end:household.income', {
            lastYear: new Date().getFullYear() - 1 // Last year
        });
    },
    choices: choices.householdIncomeChoices,
    conditional: defaultConditional,
    validations: validations.requiredValidation
};
