/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { SurveyObjectParserInterview } from 'evolution-backend/lib/services/audits/types';
import { CorrectedResponse } from 'evolution-common/lib/services/questionnaire/types';
import { _booleish } from 'chaire-lib-common/lib/utils/LodashExtensions';
import _cloneDeep from 'lodash/cloneDeep';

/**
 * @param originalCorrectedResponse - The corrected response
 */
export const parseInterviewAttributes: SurveyObjectParserInterview<CorrectedResponse> = (
    originalCorrectedResponse: Readonly<CorrectedResponse>
): CorrectedResponse => {
    const correctedResponse = _cloneDeep(originalCorrectedResponse) as CorrectedResponse;

    if (!correctedResponse || typeof correctedResponse !== 'object') {
        return correctedResponse;
    }

    // Convert acceptToBeContactedForHelp from 'yes'/'no' string to boolean
    if (correctedResponse.acceptToBeContactedForHelp !== undefined) {
        const booleishValue = _booleish(correctedResponse.acceptToBeContactedForHelp);
        correctedResponse.acceptToBeContactedForHelp = booleishValue === null ? undefined : booleishValue;
    }

    // update the assignedDate attribute:
    if (correctedResponse._assignedDay !== undefined) {
        correctedResponse.assignedDate = correctedResponse._assignedDay;
        delete correctedResponse._assignedDay;
    }

    const end =
        correctedResponse.end && typeof correctedResponse.end === 'object'
            ? (correctedResponse.end as Record<string, unknown>)
            : undefined;

    // End-section widgets are stored under `end`, not at the interview root
    if (end?.commentsOnSurvey !== undefined) {
        correctedResponse.respondentComments = end.commentsOnSurvey as string;
        delete end.commentsOnSurvey;
    }

    const otherSurveysChoice = end?.wouldLikeToParticipateInOtherSurveysChaireMobilite;
    if (otherSurveysChoice !== undefined) {
        const booleishValue = _booleish(otherSurveysChoice);
        correctedResponse.wouldLikeToParticipateInOtherSurveys = booleishValue === null ? undefined : booleishValue;
        delete end.wouldLikeToParticipateInOtherSurveysChaireMobilite;
    }

    return correctedResponse;
};
