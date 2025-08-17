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
    label: (t: TFunction) => t('selectPerson:_activePersonId'),
    choices: function (interview) {
        const persons = odSurveyHelper.getPersons({ interview });
        let personsRandomSequence = getResponse(interview, '_personRandomSequence') as string[] | null;
        if (!Array.isArray(personsRandomSequence) || personsRandomSequence.length === 0) {
            console.error(
                'No person random sequence found in interview to fill the select person widget. Will fallback to interviewable persons'
            );
            const interviewablePersons = odSurveyHelper.getInterviewablePersonsArray({ interview });
            personsRandomSequence = interviewablePersons.map((person) => person._uuid);
        }
        return personsRandomSequence
            .map((personId, index) => {
                const person = persons[personId];
                if (!person) {
                    console.error(
                        `Person with ID ${personId} not found in interview. This should not happen, check the interview data.`
                    );
                    return null; // Skip this person if not found
                }
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
            })
            .filter((person) => person !== null); // Filter out any null values
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
