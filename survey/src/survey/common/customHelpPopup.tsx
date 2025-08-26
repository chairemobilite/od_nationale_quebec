import moment from 'moment';
import { TFunction } from 'i18next';
import { ButtonWidgetConfig, HelpPopup } from 'evolution-common/lib/services/questionnaire/types';
import { getResponse } from 'evolution-common/lib/utils/helpers';
import i18n from 'chaire-lib-frontend/lib/config/i18n.config';
import * as odSurveyHelpers from 'evolution-common/lib/services/odSurvey/helpers';
import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import { getFormattedDate } from 'evolution-frontend/lib/services/display/frontendHelper';
// import { countPersons, getPersonsObject, selfResponseAge } from '../helperFunctions/helper';

export const cityHelpPopup: HelpPopup = {
    title: {
        fr: 'Quoi écrire si ce n\'est pas une ville ?',
        en: 'What to write if it\'s not a city?'
    },
    content: {
        fr: function (_interview, _path) {
            return 'Vous pouvez aussi mettre le nom de votre village, municipalité ou réserve autochtone';
        },
        en: function (_interview, _path) {
            return 'You can also put the name of your village, county or indigeneous reserve.';
        }
    }
};

// TODO: Use the assignedDate from the interview object instead of the date of the survey.
// TODO: Update the assignedDate from serverFieldUpdate.ts and test it from serverFieldUpdate.test.ts
export const householdSizeHelpPopup: HelpPopup = {
    title: {
        fr: 'Qui inclure dans ce nombre ?',
        en: 'Who to include?'
    },
    containsHtml: true,
    content: (t: TFunction, interview) => {
        // assigned date should be the day before the interview started:
        const assignedDay = getResponse(interview, '_assignedDay') as string;
        const assignedDate = getFormattedDate(assignedDay, { withDayOfWeek: true, withRelative: true });

        return t('customLabel:HomeHouseholdSizeHelpContent', {
            assignedDate
        });
    }
};

export const householdCarNumberHelpPopup: HelpPopup = {
    title: {
        fr: 'Quels véhicules inclure dans ce nombre?',
        en: 'Which vehicles to include?'
    },
    content: {
        fr: function (_interview, _path) {
            return `
* **Inclure les automobiles, VUS, camions légers, camions, fourgonnettes**
* **Inclure tous les véhicules fournis ou loués par un employeur que les membres de votre ménage utilisent pour aller au travail ou pour des raisons personnelles**
* ~~Ne pas inclure les mobylettes, scooters et motos (à essence ou électriques)~~
* ~~Ne pas inclure les véhicules d'autopartage~~
* ~~Ne pas inclure un véhicule stationné au lieu de travail utilisé exclusivement pour le travail~~
* ~~Ne pas inclure les vélos ou vélos électriques~~
* ~~Ne pas inclure les trottinettes (électriques ou non)~~
* ~~Ne pas inclure les véhicules remisés ou de collection utilisés rarement~~
`;
        },
        en: function (_interview, _path) {
            return `
* **Include cars, SUV, light-duty trucks, trucks, vans**
* **Include all vehicles made available or leased by an employer that members of your household use to go to work or for personal reasons**
* ~~Do not include moped, scooters and motorcycles (gas or electric)~~
* ~~Do not include carsharing vehicles~~
* ~~Do not include a vehicle parked at work and used exclusively for work~~
* ~~Do not include bicycles or electric bicycles~~
* ~~Do not include kick scooters or electric scooters~~
* ~~Do not include stowed vehicles or collection vehicles used rarely~~
`;
        }
    }
};

export const validateHouseholdAgesHelpPopup: ButtonWidgetConfig['confirmPopup'] = {
    content: (t: TFunction, interview, path) => {
        const countPersons = odSurveyHelpers.countPersons({ interview });
        return t('household:popup.validateHouseholdAgesHelp', {
            count: countPersons
        });
    },
    showConfirmButton: false,
    cancelButtonColor: 'blue',
    cancelButtonLabel: {
        fr: 'OK',
        en: 'OK'
    },
    conditional: function (interview) {
        const persons = odSurveyHelpers.getPersonsArray({ interview });
        const allPersonsHaveAge = persons.find((person) => _isBlank(person.age)) === undefined;
        // FIXME Why 16? In the config, we have selfResponseMinimumAge, interviewableAge, adultAge, drivingLicenseAge Can we use one of those instead?
        const atLeastOnePersonOlderThan16 =
            persons.find((person) => !_isBlank(person.age) && person.age >= 16) !== undefined;
        return allPersonsHaveAge && !atLeastOnePersonOlderThan16;
    }
};
