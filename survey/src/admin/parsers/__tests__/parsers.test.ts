/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { parseInterviewAttributes } from '../interview.parser';
import { parseHomeAttributes } from '../home.parser';
import { parseTripAttributes } from '../trip.parser';
import { parseVisitedPlaceAttributes } from '../visitedPlace.parser';
import { surveyObjectParsers } from '../index';
import { CorrectedResponse } from 'evolution-common/lib/services/questionnaire/types';
import { ExtendedTripAttributes } from 'evolution-common/lib/services/baseObjects/Trip';
import { ExtendedVisitedPlaceAttributes } from 'evolution-common/lib/services/baseObjects/VisitedPlace';

describe('OD Nationale Quebec Survey Parsers', () => {

    describe('Survey-Specific Parser Configuration', () => {
        test.each([
            ['interview', parseInterviewAttributes],
            ['home', parseHomeAttributes],
            ['trip', parseTripAttributes],
            ['visitedPlace', parseVisitedPlaceAttributes]
        ])('should have %s parser configured correctly', (parserName, expectedFunction) => {
            expect(surveyObjectParsers[parserName as keyof typeof surveyObjectParsers]).toBeDefined();
            expect(typeof surveyObjectParsers[parserName as keyof typeof surveyObjectParsers]).toBe('function');
            expect(surveyObjectParsers[parserName as keyof typeof surveyObjectParsers]).toBe(expectedFunction);
        });

        test.each([
            'household',
            'person',
            'journey',
            'segment'
        ])('should not have %s parser (unused in this survey)', (parserName) => {
            expect(surveyObjectParsers[parserName as keyof typeof surveyObjectParsers]).toBeUndefined();
        });
    });

    describe('Survey-Specific Parser Behavior', () => {
        it('should handle OD Nationale Quebec interview fields correctly', () => {
            const correctedResponse: CorrectedResponse = {
                acceptToBeContactedForHelp: 'yes',
                wouldLikeToParticipateInOtherSurveys: 'no',
                _assignedDay: '2025-01-15'
            };

            const result = surveyObjectParsers.interview!(correctedResponse);

            // Verify OD Nationale Quebec specific conversions
            expect(result.acceptToBeContactedForHelp).toBe(true);
            expect(result.wouldLikeToParticipateInOtherSurveys).toBe(false);
            expect(result.assignedDate).toBe('2025-01-15');
        });

        it('should handle Quebec address formats correctly', () => {
            const homeAttributes = {
                address: '1234 Rue Sainte-Catherine Ouest, Apt 5B',
                city: 'Montréal',
                region: 'Québec',
                country: 'Canada',
                postalCode: 'H3G 1P1'
            };

            const correctedResponse: CorrectedResponse = {};

            const result = surveyObjectParsers.home!(homeAttributes, correctedResponse);

            expect(result).toEqual({
                address: {
                    fullAddress: '1234 Rue Sainte-Catherine Ouest, Apt 5B',
                    municipalityName: 'Montréal',
                    region: 'Québec',
                    country: 'Canada',
                    postalCode: 'H3G 1P1'
                }
            });
        });

        it('should handle travel survey time assignments correctly', () => {
            const correctedResponse: CorrectedResponse = {
                _assignedDay: '2025-01-15'
            };

            const tripAttributes: ExtendedTripAttributes = {
                _uuid: 'test-trip-uuid',
                departureTime: 28800, // 8:00 AM
                arrivalTime: 32400    // 9:00 AM
            };

            const visitedPlaceAttributes: ExtendedVisitedPlaceAttributes = {
                _uuid: 'test-visited-place-uuid',
                arrivalTime: 32400,   // 9:00 AM
                departureTime: 36000  // 10:00 AM
            };

            // Parse objects as they would be in the survey
            const tripResult = surveyObjectParsers.trip!(tripAttributes, correctedResponse);
            const visitedPlaceResult = surveyObjectParsers.visitedPlace!(visitedPlaceAttributes, correctedResponse);

            // Verify time assignments for travel survey
            expect(tripResult.startTime).toBe(28800);
            expect(tripResult.endTime).toBe(32400);
            expect(tripResult.startDate).toBe('2025-01-15');
            expect(tripResult.endDate).toBe('2025-01-15');

            expect(visitedPlaceResult.startTime).toBe(32400);
            expect(visitedPlaceResult.endTime).toBe(36000);
            expect(visitedPlaceResult.startDate).toBe('2025-01-15');
            expect(visitedPlaceResult.endDate).toBe('2025-01-15');
        });
    });

    describe('Survey Configuration Validation', () => {
        test.each([
            ['interview', parseInterviewAttributes],
            ['home', parseHomeAttributes],
            ['trip', parseTripAttributes],
            ['visitedPlace', parseVisitedPlaceAttributes]
        ])('should use correct parser implementation for %s', (parserName, expectedFunction) => {
            expect(surveyObjectParsers[parserName as keyof typeof surveyObjectParsers]).toBe(expectedFunction);
        });

        it('should have correct parser configuration for OD Nationale Quebec survey', () => {
            // Verify we have exactly the parsers we need for this survey
            const expectedParsers = ['interview', 'home', 'trip', 'visitedPlace'];
            const actualParsers = Object.keys(surveyObjectParsers).filter((key) =>
                surveyObjectParsers[key as keyof typeof surveyObjectParsers] !== undefined
            );

            expect(actualParsers.sort()).toEqual(expectedParsers.sort());
        });
    });

    describe('Survey Data Flow Integration', () => {
        it('should handle complete OD survey data flow', () => {
            // Simulate a complete OD survey response
            const correctedResponse: CorrectedResponse = {
                acceptToBeContactedForHelp: 'yes',
                _assignedDay: '2025-01-15'
            };

            const homeAttributes = {
                address: '123 Rue de la Paix',
                city: 'Québec',
                region: 'Québec',
                postalCode: 'G1R 2B5'
            };

            const tripAttributes: ExtendedTripAttributes = {
                _uuid: 'od-trip-uuid',
                departureTime: 25200, // 7:00 AM
                arrivalTime: 27000,   // 7:30 AM
                mode: 'transit',
                purpose: 'work'
            };

            // Parse as would happen in the survey system
            const interviewResult = surveyObjectParsers.interview!(correctedResponse);
            const homeResult = surveyObjectParsers.home!(homeAttributes, correctedResponse);
            const tripResult = surveyObjectParsers.trip!(tripAttributes, correctedResponse);

            // Verify complete data flow
            expect(interviewResult.acceptToBeContactedForHelp).toBe(true);
            expect(interviewResult.assignedDate).toBe('2025-01-15');

            expect(homeResult).toEqual({
                address: {
                    fullAddress: '123 Rue de la Paix',
                    municipalityName: 'Québec',
                    region: 'Québec',
                    postalCode: 'G1R 2B5'
                }
            });

            expect(tripResult.startTime).toBe(25200);
            expect(tripResult.endTime).toBe(27000);
            expect(tripResult.startDate).toBe('2025-01-15');
            expect(tripResult.mode).toBe('transit');
            expect(tripResult.purpose).toBe('work');
        });

        it('should preserve survey-specific fields during parsing', () => {
            const correctedResponse: CorrectedResponse = {
                acceptToBeContactedForHelp: 'yes',
                _assignedDay: '2025-01-15',
                // Survey-specific fields that should be preserved
                surveyVersion: '2025.1',
                dataCollectionMethod: 'web',
                completionTime: 1800
            };

            const originalSurveyVersion = correctedResponse.surveyVersion;
            const originalDataCollectionMethod = correctedResponse.dataCollectionMethod;
            const originalCompletionTime = correctedResponse.completionTime;

            const result = surveyObjectParsers.interview!(correctedResponse);

            // Verify survey-specific fields are preserved
            expect(result.surveyVersion).toBe(originalSurveyVersion);
            expect(result.dataCollectionMethod).toBe(originalDataCollectionMethod);
            expect(result.completionTime).toBe(originalCompletionTime);

            // Verify parsing still worked
            expect(result.acceptToBeContactedForHelp).toBe(true);
        });
    });
});
