/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { SurveyObjectParser } from 'evolution-backend/lib/services/audits/types';
import { CorrectedResponse } from 'evolution-common/lib/services/questionnaire/types';
import { ExtendedTripAttributes } from 'evolution-common/lib/services/baseObjects/Trip';

/**
 * @param tripAttributes - The trip attributes to parse (modified in place)
 * @param correctedResponse - The corrected response
 */
export const parseTripAttributes: SurveyObjectParser<ExtendedTripAttributes, CorrectedResponse> = (
    tripAttributes: ExtendedTripAttributes,
    correctedResponse: CorrectedResponse
): void => {
    // update start and end times from departure/arrival times:
    if (tripAttributes.departureTime !== undefined) {
        tripAttributes.startTime = tripAttributes.departureTime as number;
    }
    if (tripAttributes.arrivalTime !== undefined) {
        tripAttributes.endTime = tripAttributes.arrivalTime as number;
    }

    if (!correctedResponse) {
        return;
    }

    // update start and end dates from assigned date:
    if (correctedResponse._assignedDay) {
        tripAttributes.startDate = correctedResponse._assignedDay;
    }
    if (correctedResponse._assignedDay) {
        tripAttributes.endDate = correctedResponse._assignedDay;
    }
};
