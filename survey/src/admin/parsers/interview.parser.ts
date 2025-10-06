/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { SurveyObjectParserInterview } from 'evolution-backend/lib/services/audits/types';
import { CorrectedResponse } from 'evolution-common/lib/services/questionnaire/types';

/**
 * @param correctedResponse - The corrected response
 */
export const parseInterviewAttributes: SurveyObjectParserInterview<CorrectedResponse> = (
    correctedResponse: CorrectedResponse
): void => {
    if (!correctedResponse) {
        return;
    }

    // Convert acceptToBeContactedForHelp from 'yes'/'no' string to boolean
    if (correctedResponse.acceptToBeContactedForHelp !== undefined) {
        if (
            correctedResponse.acceptToBeContactedForHelp === 'yes' ||
            correctedResponse.acceptToBeContactedForHelp === true
        ) {
            correctedResponse.acceptToBeContactedForHelp = true;
        } else if (
            correctedResponse.acceptToBeContactedForHelp === 'no' ||
            correctedResponse.acceptToBeContactedForHelp === false
        ) {
            correctedResponse.acceptToBeContactedForHelp = false;
        } else {
            correctedResponse.acceptToBeContactedForHelp = undefined;
        }
    }

    // Also convert wouldLikeToParticipateInOtherSurveys if it exists
    if (correctedResponse.wouldLikeToParticipateInOtherSurveys !== undefined) {
        if (
            correctedResponse.wouldLikeToParticipateInOtherSurveys === 'yes' ||
            correctedResponse.wouldLikeToParticipateInOtherSurveys === true
        ) {
            correctedResponse.wouldLikeToParticipateInOtherSurveys = true;
        } else if (
            correctedResponse.wouldLikeToParticipateInOtherSurveys === 'no' ||
            correctedResponse.wouldLikeToParticipateInOtherSurveys === false
        ) {
            correctedResponse.wouldLikeToParticipateInOtherSurveys = false;
        } else {
            correctedResponse.wouldLikeToParticipateInOtherSurveys = undefined;
        }
    }

    // update the assignedDate attribute:
    if (correctedResponse._assignedDay) {
        correctedResponse.assignedDate = correctedResponse._assignedDay;
    }
};
