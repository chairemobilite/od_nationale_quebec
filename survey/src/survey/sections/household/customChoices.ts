import moment from 'moment';
import i18n from 'evolution-frontend/lib/config/i18n.config';
import { getResponse } from 'evolution-common/lib/utils/helpers';
import { preferNotToAnswer } from '../../common/choices';
import { TFunction } from 'i18next';
import { countPersons, getPerson } from 'evolution-common/lib/services/odSurvey/helpers';
import { ChoiceType } from 'evolution-common/lib/services/questionnaire/types';

const formatDateWithDowOfWeek = (date) => date.locale(i18n.language).format('dddd LL');
const getDayChoices = (interview) => {
    const assignedDay = getResponse(interview, '_assignedDay');
    // For day choices, take the assigned day as reference, or take today
    const currentWeekDay = assignedDay ? moment(assignedDay) : moment();
    const lastMonday = currentWeekDay.subtract(1, 'week').startOf('isoWeek').format('YYYY-MM-DD');
    return [
        {
            value: 'monday',
            label: (t) => formatDateWithDowOfWeek(moment(lastMonday))
        },
        {
            value: 'tuesday',
            label: (t) => formatDateWithDowOfWeek(moment(lastMonday).add(1, 'day'))
        },
        {
            value: 'wednesday',
            label: (t) => formatDateWithDowOfWeek(moment(lastMonday).add(2, 'day'))
        },
        {
            value: 'thursday',
            label: (t) => formatDateWithDowOfWeek(moment(lastMonday).add(3, 'day'))
        },
        {
            value: 'friday',
            label: (t) => formatDateWithDowOfWeek(moment(lastMonday).add(4, 'day'))
        },
        {
            value: 'saturday',
            label: (t) => formatDateWithDowOfWeek(moment(lastMonday).add(5, 'day'))
        },
        {
            value: 'sunday',
            label: (t) => formatDateWithDowOfWeek(moment(lastMonday).add(6, 'day'))
        }
    ];
};

export const lastWeekTravelToWorkDaysCustomChoices = (interview) => [
    ...getDayChoices(interview),
    {
        value: 'no',
        label: {
            fr: 'Pas de déplacement pour le travail cette semaine.',
            en: 'No travel for work this week.'
        }
    },
    ...preferNotToAnswer
];

export const lastWeekRemoteWorkDaysCustomChoices = (interview) => [
    ...getDayChoices(interview),
    {
        value: 'no',
        label: {
            fr: 'Pas de télétravail cette semaine.',
            en: 'No remote work this week.'
        }
    },
    ...preferNotToAnswer
];

// FIXME This is copied from the `workPlaceBeforeLeaveTypeChoices` type in
// choices.tsx. It was copied from there because the choices contain the nickname
export const workPlaceBeforeLeaveTypeCustomChoices: ChoiceType[] = [
    {
        value: 'onLocation',
        label: (t: TFunction, interview, path) => {
            const activePerson = getPerson({ interview, path });
            const nickname = activePerson?.nickname || t('survey:noNickname');
            return t('household:workPlaceBeforeLeaveTypeChoicesOnLocation', {
                nickname,
                count: countPersons({ interview })
            });
        }
    },
    {
        value: 'hybrid',
        label: (t: TFunction, interview, path) => {
            const activePerson = getPerson({ interview, path });
            const nickname = activePerson?.nickname || t('survey:noNickname');
            return t('household:workPlaceBeforeLeaveTypeChoicesHybrid', {
                nickname,
                count: countPersons({ interview })
            });
        }
    },
    {
        value: 'onTheRoadWithUsualPlace',
        label: (t: TFunction, interview, path) => {
            const activePerson = getPerson({ interview, path });
            const nickname = activePerson?.nickname || t('survey:noNickname');
            return t('household:workPlaceBeforeLeaveTypeChoicesOnTheRoadWithUsualPlace', {
                nickname,
                count: countPersons({ interview })
            });
        }
    },
    {
        value: 'onTheRoadWithoutUsualPlace',
        label: (t: TFunction, interview, path) => {
            const activePerson = getPerson({ interview, path });
            const nickname = activePerson?.nickname || t('survey:noNickname');
            return t('household:workPlaceBeforeLeaveTypeChoicesOnTheRoadWithoutUsualPlace', {
                nickname,
                count: countPersons({ interview })
            });
        }
    },
    {
        value: 'remote',
        label: (t: TFunction, interview, path) => {
            const activePerson = getPerson({ interview, path });
            const nickname = activePerson?.nickname || t('survey:noNickname');
            return t('household:workPlaceBeforeLeaveTypeChoicesRemote', {
                nickname,
                count: countPersons({ interview })
            });
        }
    }
];
