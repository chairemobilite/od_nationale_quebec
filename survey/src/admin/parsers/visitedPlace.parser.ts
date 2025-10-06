/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import _cloneDeep from 'lodash/cloneDeep';

import { ExtendedVisitedPlaceAttributes } from 'evolution-common/lib/services/baseObjects/VisitedPlace';
import { CorrectedResponse } from 'evolution-common/lib/services/questionnaire/types';
import { SurveyObjectParser } from 'evolution-backend/lib/services/audits/types';

/**
 * @param originalCorrectedVisitedPlaceAttributes - The visited place attributes to parse
 * @param correctedResponse - The corrected response
 */
export const parseVisitedPlaceAttributes: SurveyObjectParser<ExtendedVisitedPlaceAttributes, CorrectedResponse> = (
    originalCorrectedVisitedPlaceAttributes: Readonly<ExtendedVisitedPlaceAttributes>,
    correctedResponse: Readonly<CorrectedResponse>
): ExtendedVisitedPlaceAttributes => {
    const visitedPlaceAttributes = _cloneDeep(
        originalCorrectedVisitedPlaceAttributes
    ) as ExtendedVisitedPlaceAttributes;

    if (!visitedPlaceAttributes || typeof visitedPlaceAttributes !== 'object') {
        return visitedPlaceAttributes;
    }

    // update start and end times from arrival/departure times:
    if (visitedPlaceAttributes.arrivalTime !== undefined) {
        visitedPlaceAttributes.startTime = Number(visitedPlaceAttributes.arrivalTime);
    }
    if (visitedPlaceAttributes.departureTime !== undefined) {
        visitedPlaceAttributes.endTime = Number(visitedPlaceAttributes.departureTime);
    }

    if (!correctedResponse) {
        return visitedPlaceAttributes;
    }

    // update start and end dates from assigned date:
    if (correctedResponse._assignedDay !== undefined) {
        visitedPlaceAttributes.startDate = correctedResponse._assignedDay;
        visitedPlaceAttributes.endDate = correctedResponse._assignedDay;
    }

    return visitedPlaceAttributes;
};
