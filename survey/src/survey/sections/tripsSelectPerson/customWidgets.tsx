import { TFunction } from 'i18next';
import { faMale } from '@fortawesome/free-solid-svg-icons/faMale';
import { faFemale } from '@fortawesome/free-solid-svg-icons/faFemale';
import { faChild } from '@fortawesome/free-solid-svg-icons/faChild';
import { faPortrait } from '@fortawesome/free-solid-svg-icons/faPortrait';
import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import * as odSurveyHelper from 'evolution-common/lib/services/odSurvey/helpers';
import * as WidgetConfig from 'evolution-common/lib/services/questionnaire/types';
import { getResponse } from 'evolution-common/lib/utils/helpers';

// FIXME This widget is custom because of the choices and validation string
export const selectPerson: WidgetConfig.InputRadioType = {
    type: 'question',
    path: '_activePersonId',
    twoColumns: false,
    sameLine: false,
    inputType: 'radio',
    datatype: 'string',
    containsHtml: true,
    label: (t: TFunction) => t('tripsSelectPerson:_activePersonId'),
    choices: function (interview) {
        const interviewablePersons = odSurveyHelper.getInterviewablePersonsArray({ interview });
        return interviewablePersons.map((person, index) => {
            let icon = faPortrait;
            if (person.age < 15) {
                icon = faChild;
            } else if (person.gender === 'male') {
                icon = faMale;
            } else if (person.gender === 'female') {
                icon = faFemale;
            }
            return {
                value: person._uuid,
                label: {
                    fr: `<div style={{display: 'flex', alignItems: 'center', fontSize: '150%', fontWeight: 300}}><FontAwesomeIcon icon={icon} className="faIconLeft" style={{width: '4rem', height: '4rem'}} />Personne ${
                        index + 1
                    } • ${person.nickname} (${person.age} ans)</div>`,
                    en: `<div style={{display: 'flex', alignItems: 'center', fontSize: '150%', fontWeight: 300}}><FontAwesomeIcon icon={icon} className="faIconLeft" style={{width: '4rem', height: '4rem'}} />Person ${
                        index + 1
                    } • ${person.nickname} (${person.age} years old)</div>`
                }
            };
        });
    },
    validations: (value) => {
        return [
            {
                validation: _isBlank(value),
                errorMessage: {
                    fr: 'Veuillez sélectionner une personne pour poursuivre.',
                    en: 'Please select a person to continue.'
                }
            }
        ];
    }
};

// FIXME This widget is custom because of the choices, conditional and label
export const personNewPerson = {
    type: 'question',
    inputType: 'button',
    path: '_showNewPersonPopupButton',
    align: 'center',
    datatype: 'boolean',
    twoColumns: false,
    isModal: true,
    containsHtml: true,
    label: (t: TFunction, interview) => {
        const activePerson = odSurveyHelper.getActivePerson({ interview });
        const nickname = activePerson.nickname;
        return t('tripsSelectPerson:_showNewPersonPopupButton', {
            nickname
        });
    },
    choices: [
        {
            value: true,
            label: (t: TFunction) => t('customLabel:Continue'),
            color: 'green'
        }
    ],
    conditional: function (interview, path) {
        const interviewablePersons = odSurveyHelper.getInterviewablePersonsArray({ interview });
        const showPopup = getResponse(interview, '_showNewPersonPopup', false);
        return [interviewablePersons.length > 1 && showPopup === true, undefined];
    }
};
