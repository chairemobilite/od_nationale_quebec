import moment from 'moment';
import i18n from 'evolution-frontend/lib/config/i18n.config';
import { TFunction } from 'i18next';
import { _booleish, _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import * as odSurveyHelper from 'evolution-common/lib/services/odSurvey/helpers';
import * as WidgetConfig from 'evolution-common/lib/services/questionnaire/types';
import { getResponse } from 'evolution-common/lib/utils/helpers';
import * as validations from 'evolution-common/lib/services/widgets/validations/validations';
import config from 'evolution-common/lib/config/project.config';
import { getFormattedDate } from 'evolution-frontend/lib/services/display/frontendHelper';
import { getHomeAddressOneLine } from '../../common/helper';
import { getSwitchPersonWidgets } from 'evolution-common/lib/services/questionnaire/sections/common/widgetsSwitchPerson';

const switchPersonWidgets = getSwitchPersonWidgets();

export const activePersonTitle: WidgetConfig.TextWidgetConfig = switchPersonWidgets.activePersonTitle;

export const buttonSwitchPerson: WidgetConfig.ButtonWidgetConfig = switchPersonWidgets.buttonSwitchPerson;

// FIXME This widget is custom because of the choices, conditional and label, it is also in the tripsSelectPeron
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
        return t('selectPerson:_showNewPersonPopupButton', {
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

// FIXME Custom because of the choices
export const personWhoWillAnswerForThisPerson: WidgetConfig.InputRadioType = {
    type: 'question',
    path: 'household.persons.{_activePersonId}.journeys.{_activeJourneyId}.whoWillAnswerForThisPerson',
    inputType: 'radio',
    datatype: 'string',
    twoColumns: false,
    choices: function (interview) {
        const interviewablePersons = odSurveyHelper.getInterviewablePersonsArray({ interview });
        return interviewablePersons
            .filter((person) => person.age >= config.selfResponseMinimumAge)
            .map((person) => ({
                value: person._uuid,
                label: person.nickname
            }));
    },
    sameLine: false,
    label: (t: TFunction, interview) => {
        const activePerson = odSurveyHelper.getActivePerson({ interview });
        return t('tripsIntro:whoAnswers', {
            nickname: activePerson.nickname
        });
    },
    conditional: function (interview, path) {
        const interviewablePersons = odSurveyHelper.getInterviewablePersonsArray({ interview });
        const canRespondPersons = interviewablePersons.filter((person) => person.age >= config.selfResponseMinimumAge);
        return [canRespondPersons.length > 1, canRespondPersons.length === 1 ? canRespondPersons[0]._uuid : null];
    },
    validations: validations.requiredValidation
};

// FIXME Custom because of the label with date and other placeholders
export const personDidTrips: WidgetConfig.InputRadioType = {
    type: 'question',
    path: 'household.persons.{_activePersonId}.journeys.{_activeJourneyId}.personDidTrips',
    inputType: 'radio',
    datatype: 'string',
    twoColumns: false,
    containsHtml: true,
    label: (t: TFunction, interview) => {
        const activePerson = odSurveyHelper.getActivePerson({ interview });
        const nickname = activePerson?.nickname || t('survey:noNickname');
        const assignedDay = getResponse(interview, '_assignedDay');
        const assignedDate = moment(assignedDay).locale(i18n.language).format('dddd LL');
        return t('tripsIntro:personDidTrips', {
            context: activePerson.gender,
            nickname,
            assignedDate,
            count: odSurveyHelper.getCountOrSelfDeclared({ interview, person: activePerson })
        });
    },
    helpPopup: {
        containsHtml: true,
        title: (t: TFunction, interview) => {
            const assignedDay = getResponse(interview, '_assignedDay');
            return t('customLabel:WhyThisDate');
        },
        content: (t: TFunction, interview) => t('customLabel:WhyThisDateExplanation')
    },
    choices: [
        {
            value: 'yes',
            label: {
                fr: 'Oui',
                en: 'Yes'
            }
        },
        {
            value: 'no',
            label: {
                fr: 'Non',
                en: 'No'
            }
        },
        {
            value: 'dontKnow',
            label: {
                fr: 'Je ne sais pas',
                en: 'I don\'t know'
            },
            conditional: function (interview, path) {
                // FIXME originally, this appeared also for interviewers, but we won't have interviewers for this survey. or do we want to support it?
                return (config as any).acceptUnknownDidTrips;
            }
        }
    ],
    validations: validations.requiredValidation
};

// FIXME Custom because of the labels with date and other placeholders, as well as the choices labels
export const personDidTripsChangeConfirm: WidgetConfig.InputRadioType = {
    type: 'question',
    path: 'household.persons.{_activePersonId}.journeys.{_activeJourneyId}.personDidTripsChangeConfirm',
    inputType: 'radio',
    datatype: 'string',
    twoColumns: false,
    label: (t: TFunction, interview) => {
        const activePerson = odSurveyHelper.getActivePerson({ interview });
        const tripsDate = getResponse(interview, '_assignedDay', null);
        const formattedTripsDate = getFormattedDate(tripsDate as string, { withRelative: true, locale: i18n.language });
        return t('tripsIntro:personDidTripsChangeConfirm', {
            count: odSurveyHelper.getCountOrSelfDeclared({ interview, person: activePerson }),
            nickname: activePerson.nickname,
            context: activePerson.gender,
            assignedDate: formattedTripsDate
        });
    },
    choices: [
        {
            value: 'no',
            label: (t: TFunction, interview) => {
                const activePerson = odSurveyHelper.getActivePerson({ interview });
                const tripsDate = getResponse(interview, '_assignedDay', null);
                const formattedTripsDate = getFormattedDate(tripsDate as string, {
                    withRelative: true,
                    locale: i18n.language
                });
                return t('customLabel:personDidTripsChangeConfirmChoiceNo', {
                    count: odSurveyHelper.getCountOrSelfDeclared({ interview, person: activePerson }),
                    nickname: activePerson.nickname,
                    assignedDate: formattedTripsDate
                });
            }
        },
        {
            value: 'yes',
            label: (t: TFunction, interview) => {
                const activePerson = odSurveyHelper.getActivePerson({ interview });
                const tripsDate = getResponse(interview, '_assignedDay', null);
                const formattedTripsDate = getFormattedDate(tripsDate as string, {
                    withRelative: true,
                    locale: i18n.language
                });
                return t('customLabel:personDidTripsChangeConfirmChoiceYes', {
                    count: odSurveyHelper.getCountOrSelfDeclared({ interview, person: activePerson }),
                    nickname: activePerson.nickname,
                    assignedDate: formattedTripsDate
                });
            }
        }
    ],
    conditional: function (interview, path) {
        const activeJourney = odSurveyHelper.getActiveJourney({ interview });
        if (activeJourney === null) {
            return [false, null];
        }
        const personDidTrips = getResponse(interview, '../personDidTrips', null);
        const visitedPlaces = odSurveyHelper.getVisitedPlacesArray({
            journey: activeJourney
        });
        if (_isBlank(personDidTrips)) {
            return [false, null];
        }
        return [_booleish(personDidTrips) === false && visitedPlaces.length > 1, null];
    },
    validations: validations.requiredValidation
};

// FIXME Custom because of the label with date
export const visitedPlacesIntro: WidgetConfig.TextWidgetConfig = {
    type: 'text',
    path: 'visitedPlacesIntro',
    containsHtml: true,
    text: (t: TFunction, interview) => {
        const activePerson = odSurveyHelper.getActivePerson({ interview });
        const nickname = activePerson?.nickname || t('survey:noNickname');
        const tripsDate = getResponse(interview, '_assignedDay', null);
        const formattedTripsDate = getFormattedDate(tripsDate as string, { withRelative: true, locale: i18n.language });
        return t('tripsIntro:didTripsIntro', {
            context: activePerson.gender,
            nickname,
            assignedDate: formattedTripsDate,
            count: odSurveyHelper.getCountOrSelfDeclared({ interview, person: activePerson })
        });
    },
    conditional: function (interview, path) {
        const journey = odSurveyHelper.getActiveJourney({ interview });
        return [
            _booleish((journey as any).personDidTrips) || _booleish((journey as any).personDidTripsChangeConfirm),
            undefined
        ];
    }
};

// FIXME Custom because of the label with date and other placeholders, the conditional (but we could use customConditional) and the required validation text
export const personDeparturePlaceIsHome: WidgetConfig.InputRadioType = {
    type: 'question',
    path: 'household.persons.{_activePersonId}.journeys.{_activeJourneyId}.departurePlaceIsHome',
    inputType: 'radio',
    datatype: 'string',
    twoColumns: false,
    containsHtml: true,
    choices: [
        {
            value: 'yes',
            label: (t: TFunction) => t('survey:Yes')
        },
        {
            value: 'no',
            label: (t: TFunction) => t('survey:No')
        }
    ],
    sameLine: false,
    label: (t: TFunction, interview) => {
        const activePerson = odSurveyHelper.getActivePerson({ interview });
        const nickname = activePerson?.nickname || t('survey:noNickname');
        const assignedDay = moment(getResponse(interview, '_assignedDay'));
        const dayBefore = moment(assignedDay).subtract(1, 'days');
        const homeAddress = getHomeAddressOneLine(interview);
        const dayBeforeStr = dayBefore
            .toDate()
            .toLocaleDateString(i18n.language, { weekday: 'long', month: 'long', day: 'numeric' });
        const assignedDayStr = assignedDay
            .toDate()
            .toLocaleDateString(i18n.language, { weekday: 'long', month: 'long', day: 'numeric' });

        return t('tripsIntro:departurePlaceIsHome', {
            context: activePerson.gender,
            nickname,
            dayOne: dayBeforeStr,
            dayTwo: assignedDayStr,
            address: homeAddress,
            count: odSurveyHelper.getCountOrSelfDeclared({ interview, person: activePerson })
        });
    },
    conditional: function (interview, path) {
        const journey = odSurveyHelper.getActiveJourney({ interview });
        const departurePlaceIsHome = getResponse(interview, path, null);
        const firstVisitedPlace = odSurveyHelper.getVisitedPlacesArray({ journey })[0];
        const personDidTrips = (journey as any).personDidTrips;
        const personDidTripsChangeConfirm = (journey as any).personDidTripsChangeConfirm;
        if (
            _booleish(personDidTrips) !== true ||
            (_isBlank(personDidTrips) && _booleish(personDidTripsChangeConfirm) === false)
        ) {
            return [false, null];
        } else if (firstVisitedPlace && (firstVisitedPlace.activity || firstVisitedPlace.activityCategory)) {
            return [false, firstVisitedPlace.activity === 'home' ? 'yes' : 'no'];
        } else if (_isBlank(personDidTrips)) {
            return [false, departurePlaceIsHome];
        }
        return [true, departurePlaceIsHome];
    },
    validations: function (value) {
        return [
            {
                validation: _isBlank(value),
                errorMessage: (t: TFunction) => t('survey:visitedPlace:departurePlaceIsRequiredError')
            }
        ];
    }
};
