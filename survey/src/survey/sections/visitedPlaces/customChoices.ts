import { TFunction } from 'i18next';
import * as conditionals from '../../common/conditionals';
import * as customConditionals from '../../common/customConditionals';
import { getPerson, countPersons } from 'evolution-common/lib/services/odSurvey/helpers';
import { ChoiceType } from 'evolution-common/lib/services/questionnaire/types';

// FIXME This is copied from the `onTheRoadArrivalTypeChoices` type in
// choices.tsx. It was copied from there because a choice required the nickname
export const onTheRoadArrivalTypeCustomChoices: ChoiceType[] = [
    {
        value: 'home',
        label: (t) => t('visitedPlaces:onTheRoadArrivalTypeHome')
    },
    {
        value: 'usualWorkPlace',
        label: (t) => t('visitedPlaces:onTheRoadArrivalTypeUsualWorkPlace'),
        conditional: conditionals.onTheRoadUsualWorkplace
    },
    {
        value: 'other',
        label: (t) => t('visitedPlaces:onTheRoadArrivalTypeOther')
    },
    {
        value: 'stayedThereUntilTheNextDay',
        label: (t: TFunction, interview, path) => {
            const activePerson = getPerson({ interview, path });
            const nickname = activePerson?.nickname || t('survey:noNickname');
            return t('visitedPlaces:onTheRoadArrivalTypeStayedThereUntilTheNextDay', {
                nickname,
                count: countPersons({ interview })
            });
        },
        conditional: customConditionals.isLastPlaceCustomConditional
    }
];
