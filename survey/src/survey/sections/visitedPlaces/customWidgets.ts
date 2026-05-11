import * as WidgetConfig from 'evolution-common/lib/services/questionnaire/types';
import * as odSurveyHelpers from 'evolution-common/lib/services/odSurvey/helpers';
import * as validations from 'evolution-common/lib/services/widgets/validations/validations';
import { TFunction } from 'i18next';
import { getResponse } from 'evolution-common/lib/utils/helpers';
import { getVisitedPlaceDescription } from 'evolution-frontend/lib/services/display/frontendHelper';
import { _booleish, _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';

const visitedPlaceOnTheRoadDepartureTypeChoices = [
    {
        value: 'home',
        label: (t: TFunction, interview, path) => t('survey:visitedPlace:onTheRoadDepartureTypeChoices:home')
    },
    {
        value: 'usualWorkPlace',
        label: (t: TFunction, interview, path) => t('survey:visitedPlace:onTheRoadDepartureTypeChoices:usualWorkPlace'),
        conditional: function (interview, path) {
            const person = odSurveyHelpers.getPerson({ interview });
            return person.workPlaceType === 'onTheRoadWithUsualPlace';
        }
    },
    {
        value: 'other',
        label: (t: TFunction, interview, path) => {
            const journey = odSurveyHelpers.getActiveJourney({ interview });
            const activeVisitedPlace = odSurveyHelpers.getActiveVisitedPlace({ interview, journey });
            const previousVisitedPlace = odSurveyHelpers.getPreviousVisitedPlace({
                journey,
                visitedPlaceId: activeVisitedPlace._uuid
            });
            const previousVisitedPlaceDescription = previousVisitedPlace
                ? getVisitedPlaceDescription(previousVisitedPlace, false, false)
                : undefined;
            return previousVisitedPlaceDescription
                ? previousVisitedPlaceDescription
                : t('survey:visitedPlace:onTheRoadDepartureTypeChoices:other');
        },
        conditional: function (interview, path) {
            const person = odSurveyHelpers.getPerson({ interview });
            const journey = odSurveyHelpers.getActiveJourney({ interview });
            const activeVisitedPlace = odSurveyHelpers.getActiveVisitedPlace({ interview, journey });
            const previousVisitedPlace = odSurveyHelpers.getPreviousVisitedPlace({
                journey,
                visitedPlaceId: activeVisitedPlace._uuid
            });
            return (
                'home' !== previousVisitedPlace.activityCategory &&
                previousVisitedPlace.activity !== 'workOnTheRoad' &&
                !(previousVisitedPlace.activity === 'workUsual' && person.workPlaceType === 'onTheRoadWithUsualPlace')
            );
        }
    }
];

export const visitedPlaceOnTheRoadDepartureType: WidgetConfig.InputRadioType = {
    type: 'question',
    inputType: 'radio',
    path: 'onTheRoadDepartureType',
    datatype: 'string',
    twoColumns: false,
    sameLine: false,
    label: (t: TFunction, interview, path) => {
        const person = odSurveyHelpers.getPerson({ interview });
        const nickname = person.nickname;
        return t('visitedPlaces:onTheRoadDepartureType', {
            nickname,
            count: odSurveyHelpers.getCountOrSelfDeclared({ interview, person })
        });
    },
    choices: visitedPlaceOnTheRoadDepartureTypeChoices,
    validations: validations.requiredValidation,
    conditional: function (interview, path) {
        const sequence = getResponse(interview, path, null, '../_sequence');
        const isNew = getResponse(interview, path, null, '../_isNew');
        const visitedPlaceActivity = getResponse(interview, path, null, '../activity');
        const condition = isNew !== false && sequence !== 1 && visitedPlaceActivity === 'workOnTheRoad';
        if (condition === false) {
            // Exit early
            return [condition, null];
        }

        // If there is only one valid departure location, auto-select it and hide this question.
        // TODO: Fix cleanly in evolution. See https://github.com/chairemobilite/evolution/issues/110
        const choices = visitedPlaceOnTheRoadDepartureTypeChoices.filter((choice) => {
            return !_isBlank(choice.conditional) ? choice.conditional(interview, path) === true : true;
        });
        if (choices.length === 1) {
            return [false, choices[0].value];
        }

        // Otherwise, display the question.
        return [true, null];
    }
};
