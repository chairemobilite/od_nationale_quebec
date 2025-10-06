/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { ExtendedVisitedPlaceAttributes } from 'evolution-common/lib/services/baseObjects/VisitedPlace';
import { CorrectedResponse } from 'evolution-common/lib/services/questionnaire/types';
import { SurveyObjectParser } from 'evolution-backend/lib/services/audits/types';

/**
 * @param visitedPlaceAttributes - The visited place attributes to parse (modified in place)
 * @param correctedResponse - The corrected response
 */
export const parseVisitedPlaceAttributes: SurveyObjectParser<ExtendedVisitedPlaceAttributes, CorrectedResponse> = (
    visitedPlaceAttributes: ExtendedVisitedPlaceAttributes,
    correctedResponse: CorrectedResponse
): void => {
    // update start and end times from arrival/departure times:
    if (visitedPlaceAttributes.arrivalTime !== undefined) {
        visitedPlaceAttributes.startTime = visitedPlaceAttributes.arrivalTime as number;
    }
    if (visitedPlaceAttributes.departureTime !== undefined) {
        visitedPlaceAttributes.endTime = visitedPlaceAttributes.departureTime as number;
    }

    if (!correctedResponse) {
        return;
    }

    // update start and end dates from assigned date:
    if (correctedResponse._assignedDay) {
        visitedPlaceAttributes.startDate = correctedResponse._assignedDay;
    }
    if (correctedResponse._assignedDay) {
        visitedPlaceAttributes.endDate = correctedResponse._assignedDay;
    }
};
