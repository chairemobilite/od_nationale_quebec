import { TFunction } from 'i18next';
import _escape from 'lodash/escape';
import i18n from 'evolution-frontend/lib/config/i18n.config';
import * as defaultInputBase from 'evolution-frontend/lib/components/inputs/defaultInputBase';
import * as WidgetConfig from 'evolution-common/lib/services/questionnaire/types';
import * as odSurveyHelpers from 'evolution-common/lib/services/odSurvey/helpers';
import * as validations from 'evolution-common/lib/services/widgets/validations/validations';
import { getSwitchPersonWidgets } from 'evolution-common/lib/services/questionnaire/sections/common/widgetsSwitchPerson';
import * as customConditionals from '../../common/customConditionals';
import { getFormattedDate } from 'evolution-frontend/lib/services/display/frontendHelper';
import { getResponse } from 'evolution-common/lib/utils/helpers';

const switchPersonWidgets = getSwitchPersonWidgets();

export const activePersonTitle: WidgetConfig.TextWidgetConfig = switchPersonWidgets.activePersonTitle;

export const buttonSwitchPerson: WidgetConfig.ButtonWidgetConfig = switchPersonWidgets.buttonSwitchPerson;

export const personNoWorkTripIntro: WidgetConfig.TextWidgetConfig = {
    type: 'text',
    containsHtml: true,
    text: (t: TFunction, interview) => {
        const person = odSurveyHelpers.getPerson({ interview });
        const nickname = _escape(person.nickname);
        const assignedDate = getFormattedDate(getResponse(interview, '_assignedDay') as string, {
            withRelative: false,
            locale: i18n.language,
            withDayOfWeek: false
        });
        return t('travelBehavior:personNoWorkTripIntro', {
            nickname,
            assignedDate,
            count: odSurveyHelpers.getCountOrSelfDeclared({ interview, person })
        });
    },
    conditional: customConditionals.shouldAskForNoWorkTripReasonCustomConditional
};

export const personNoWorkTripReasonSpecify: WidgetConfig.InputStringType = {
    ...defaultInputBase.inputStringBase,
    path: 'household.persons.{_activePersonId}.journeys.{_activeJourneyId}.noWorkTripReasonSpecify',
    twoColumns: false,
    containsHtml: true,
    label: (t: TFunction, interview, path) => {
        const activePerson = odSurveyHelpers.getPerson({ interview, path });
        const nickname = _escape(activePerson?.nickname || t('survey:noNickname'));
        const assignedDate = getFormattedDate(getResponse(interview, '_assignedDay') as string, {
            withRelative: false,
            locale: i18n.language,
            withDayOfWeek: false
        });
        return t(
            'travelBehavior:household.persons.{_activePersonId}.journeys.{_activeJourneyId}.noWorkTripReasonSpecify',
            {
                nickname,
                assignedDate,
                count: odSurveyHelpers.getCountOrSelfDeclared({ interview, person: activePerson })
            }
        );
    },
    conditional: customConditionals.shouldAskPersonNoWorkTripSpecifyCustomConditional,
    validations: validations.optionalValidation
};

export const personNoSchoolTripIntro: WidgetConfig.TextWidgetConfig = {
    type: 'text',
    containsHtml: true,
    text: (t: TFunction, interview) => {
        const person = odSurveyHelpers.getPerson({ interview });
        const nickname = _escape(person.nickname);
        const assignedDate = getFormattedDate(getResponse(interview, '_assignedDay') as string, {
            withRelative: false,
            locale: i18n.language,
            withDayOfWeek: false
        });
        return t('travelBehavior:personNoSchoolTripIntro', {
            nickname,
            assignedDate,
            count: odSurveyHelpers.getCountOrSelfDeclared({ interview, person })
        });
    },
    conditional: customConditionals.shouldAskForNoSchoolTripReasonCustomConditional
};

export const personNoSchoolTripReasonSpecify: WidgetConfig.InputStringType = {
    ...defaultInputBase.inputStringBase,
    path: 'household.persons.{_activePersonId}.journeys.{_activeJourneyId}.noSchoolTripReasonSpecify',
    twoColumns: false,
    containsHtml: true,
    label: (t: TFunction, interview, path) => {
        const activePerson = odSurveyHelpers.getPerson({ interview, path });
        const nickname = _escape(activePerson?.nickname || t('survey:noNickname'));
        const assignedDate = getFormattedDate(getResponse(interview, '_assignedDay') as string, {
            withRelative: false,
            locale: i18n.language,
            withDayOfWeek: false
        });
        return t(
            'travelBehavior:household.persons.{_activePersonId}.journeys.{_activeJourneyId}.noSchoolTripReasonSpecify',
            {
                nickname,
                assignedDate,
                count: odSurveyHelpers.getCountOrSelfDeclared({ interview, person: activePerson })
            }
        );
    },
    conditional: customConditionals.shouldAskForNoSchoolTripSpecifyCustomConditional,
    validations: validations.optionalValidation
};
