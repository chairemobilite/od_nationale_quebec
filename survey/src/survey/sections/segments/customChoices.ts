import { ChoiceType } from 'evolution-common/lib/services/questionnaire/types';
import { no } from '../../common/choices';
import { TFunction } from 'i18next';
import { getPerson, countPersons } from 'evolution-common/lib/services/odSurvey/helpers';

// FIXME This is copied from the `onDemandChoices` type in choices.tsx. It was
// copied from there because a choice required the nickname
export const onDemandCustomChoices: ChoiceType[] = [
    {
        value: 'pickupAtOrigin',
        label: (t: TFunction, interview, path) => {
            const activePerson = getPerson({ interview, path });
            const nickname = activePerson?.nickname || t('survey:noNickname');
            return t('segments:onDemandChoicesPickupAtOrigin', {
                nickname,
                count: countPersons({ interview })
            });
        }
    },
    {
        value: 'joinedStop',
        label: (t: TFunction, interview, path) => {
            const activePerson = getPerson({ interview, path });
            const nickname = activePerson?.nickname || t('survey:noNickname');
            return t('segments:onDemandChoicesJoinedStop', {
                nickname,
                count: countPersons({ interview })
            });
        }
    },
    ...no
];
