/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { SurveyObjectParsers } from 'evolution-backend/lib/services/audits/types';
import { parseInterviewAttributes } from './interview.parser';
import { parseHomeAttributes } from './home.parser';
import { parseVisitedPlaceAttributes } from './visitedPlace.parser';
import { parseTripAttributes } from './trip.parser';

/**
 * Survey object parsers configuration.
 * These parsers convert string choice values to proper types before object validation.
 */
export const surveyObjectParsers: SurveyObjectParsers = {
    interview: parseInterviewAttributes,
    home: parseHomeAttributes,
    // household: parseHouseholdAttributes
    // person: parsePersonAttributes,
    // journey: parseJourneyAttributes,
    visitedPlace: parseVisitedPlaceAttributes,
    trip: parseTripAttributes
    // segment: parseSegmentAttributes
};
