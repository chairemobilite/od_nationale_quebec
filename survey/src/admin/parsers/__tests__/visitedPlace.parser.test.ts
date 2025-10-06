/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { parseVisitedPlaceAttributes } from '../visitedPlace.parser';
import { ExtendedVisitedPlaceAttributes } from 'evolution-common/lib/services/baseObjects/VisitedPlace';
import { CorrectedResponse } from 'evolution-common/lib/services/questionnaire/types';

describe('parseVisitedPlaceAttributes', () => {
    test.each([
        [
            'startTime from arrivalTime',
            { arrivalTime: 28800, departureTime: 32400 },
            { startTime: 28800, endTime: 32400 }
        ],
        [
            'endTime from departureTime',
            { arrivalTime: 28800, departureTime: 32400 },
            { startTime: 28800, endTime: 32400 }
        ]
    ])('should update %s', (description, visitedPlaceData, expectedFields) => {
        const visitedPlaceAttributes: ExtendedVisitedPlaceAttributes = {
            _uuid: 'test-visited-place-uuid',
            ...visitedPlaceData
        };

        const correctedResponse: CorrectedResponse = {
            _assignedDay: '2025-01-15'
        };

        const result = parseVisitedPlaceAttributes(visitedPlaceAttributes, correctedResponse);

        Object.keys(expectedFields).forEach((key) => {
            expect(result[key as keyof ExtendedVisitedPlaceAttributes]).toBe(expectedFields[key as keyof typeof expectedFields]);
        });
    });

    it('should update startDate and endDate from _assignedDay', () => {
        const visitedPlaceAttributes: ExtendedVisitedPlaceAttributes = {
            _uuid: 'test-visited-place-uuid',
            arrivalTime: 28800,
            departureTime: 32400
        };

        const correctedResponse: CorrectedResponse = {
            _assignedDay: '2025-01-15'
        };

        const result = parseVisitedPlaceAttributes(visitedPlaceAttributes, correctedResponse);

        expect(result.startDate).toBe('2025-01-15');
        expect(result.endDate).toBe('2025-01-15');
    });

    test.each([
        [
            'missing arrivalTime',
            { departureTime: 32400 },
            { startTime: undefined, endTime: 32400 }
        ],
        [
            'missing departureTime',
            { arrivalTime: 28800 },
            { startTime: 28800, endTime: undefined }
        ]
    ])('should handle %s gracefully', (description, visitedPlaceData, expectedFields) => {
        const visitedPlaceAttributes: ExtendedVisitedPlaceAttributes = {
            _uuid: 'test-visited-place-uuid',
            ...visitedPlaceData
        };

        const correctedResponse: CorrectedResponse = {
            _assignedDay: '2025-01-15'
        };

        const result = parseVisitedPlaceAttributes(visitedPlaceAttributes, correctedResponse);

        Object.keys(expectedFields).forEach((key) => {
            expect(result[key as keyof ExtendedVisitedPlaceAttributes]).toBe(expectedFields[key as keyof typeof expectedFields]);
        });
    });

    test.each([
        [
            'missing corrected_response',
            {},
            { startTime: 28800, endTime: 32400, startDate: undefined, endDate: undefined }
        ],
        [
            'missing _assignedDay',
            {},
            { startTime: 28800, endTime: 32400, startDate: undefined, endDate: undefined }
        ]
    ])('should handle %s', (description, correctedResponseData, expectedFields) => {
        const visitedPlaceAttributes: ExtendedVisitedPlaceAttributes = {
            _uuid: 'test-visited-place-uuid',
            arrivalTime: 28800,
            departureTime: 32400
        };

        const correctedResponse: CorrectedResponse = correctedResponseData;

        const result = parseVisitedPlaceAttributes(visitedPlaceAttributes, correctedResponse);
        Object.keys(expectedFields).forEach((key) => {
            expect(result[key as keyof ExtendedVisitedPlaceAttributes]).toBe(expectedFields[key as keyof typeof expectedFields]);
        });
    });

    it('should preserve other visitedPlace attributes', () => {
        const visitedPlaceAttributes: ExtendedVisitedPlaceAttributes = {
            _uuid: 'test-visited-place-uuid',
            _sequence: 1,
            arrivalTime: 28800,
            departureTime: 32400,
            activity: 'work',
            geography: {
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [-73.5673, 45.5017]
                },
                properties: {}
            }
        };

        const correctedResponse: CorrectedResponse = {
            _assignedDay: '2025-01-15'
        };

        const result = parseVisitedPlaceAttributes(visitedPlaceAttributes, correctedResponse);

        // Should update time/date fields
        expect(result.startTime).toBe(28800);
        expect(result.endTime).toBe(32400);
        expect(result.startDate).toBe('2025-01-15');
        expect(result.endDate).toBe('2025-01-15');

        // Should preserve other attributes
        expect(result._uuid).toBe('test-visited-place-uuid');
        expect(result._sequence).toBe(1);
        expect(result.activity).toBe('work');
        expect(result.geography).toBeDefined();
    });

    it('should handle zero values for times correctly', () => {
        const visitedPlaceAttributes: ExtendedVisitedPlaceAttributes = {
            _uuid: 'test-visited-place-uuid',
            arrivalTime: 0, // Midnight
            departureTime: 0
        };

        const correctedResponse: CorrectedResponse = {
            _assignedDay: '2025-01-15'
        };

        const result = parseVisitedPlaceAttributes(visitedPlaceAttributes, correctedResponse);

        expect(result.startTime).toBe(0);
        expect(result.endTime).toBe(0);
    });

    it('should handle null corrected_response gracefully', () => {
        const visitedPlaceAttributes: ExtendedVisitedPlaceAttributes = {
            _uuid: 'test-visited-place-uuid',
            arrivalTime: 28800,
            departureTime: 32400
        };

        const correctedResponse = null as unknown as CorrectedResponse;

        const result = parseVisitedPlaceAttributes(visitedPlaceAttributes, correctedResponse);
        expect(result.startTime).toBe(28800);
        expect(result.endTime).toBe(32400);
        expect(result.startDate).toBeUndefined();
        expect(result.endDate).toBeUndefined();
    });
});
