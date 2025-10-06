/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { parseTripAttributes } from '../trip.parser';
import { ExtendedTripAttributes } from 'evolution-common/lib/services/baseObjects/Trip';
import { CorrectedResponse } from 'evolution-common/lib/services/questionnaire/types';

describe('parseTripAttributes', () => {
    test.each([
        [
            'startTime and endTime from departureTime and arrivalTime',
            { departureTime: 28800, arrivalTime: 32400 },
            { startTime: 28800, endTime: 32400 }
        ]
    ])('should update %s', (description, tripData, expectedFields) => {
        const tripAttributes: ExtendedTripAttributes = {
            _uuid: 'test-trip-uuid',
            ...tripData
        };

        const correctedResponse: CorrectedResponse = {
            _assignedDay: '2025-01-15'
        };

        const result = parseTripAttributes(tripAttributes, correctedResponse);

        Object.keys(expectedFields).forEach((key) => {
            expect(result[key as keyof ExtendedTripAttributes]).toBe(expectedFields[key as keyof typeof expectedFields]);
        });
    });

    it('should update startDate and endDate from _assignedDay', () => {
        const tripAttributes: ExtendedTripAttributes = {
            _uuid: 'test-trip-uuid',
            departureTime: 28800,
            arrivalTime: 32400
        };

        const correctedResponse: CorrectedResponse = {
            _assignedDay: '2025-01-15'
        };

        const result = parseTripAttributes(tripAttributes, correctedResponse);

        expect(result.startDate).toBe('2025-01-15');
        expect(result.endDate).toBe('2025-01-15');
    });

    test.each([
        [
            'missing departureTime',
            { arrivalTime: 32400 },
            { startTime: undefined, endTime: 32400 }
        ],
        [
            'missing arrivalTime',
            { departureTime: 28800 },
            { startTime: 28800, endTime: undefined }
        ]
    ])('should handle %s gracefully', (description, tripData, expectedFields) => {
        const tripAttributes: ExtendedTripAttributes = {
            _uuid: 'test-trip-uuid',
            ...tripData
        };

        const correctedResponse: CorrectedResponse = {
            _assignedDay: '2025-01-15'
        };

        const result = parseTripAttributes(tripAttributes, correctedResponse);

        Object.keys(expectedFields).forEach((key) => {
            expect(result[key as keyof ExtendedTripAttributes]).toBe(expectedFields[key as keyof typeof expectedFields]);
        });
    });

    test.each([
        [
            'missing _assignedDay',
            {},
            { startTime: 28800, endTime: 32400, startDate: undefined, endDate: undefined }
        ]
    ])('should handle %s', (description, correctedResponseData, expectedFields) => {
        const tripAttributes: ExtendedTripAttributes = {
            _uuid: 'test-trip-uuid',
            departureTime: 28800,
            arrivalTime: 32400
        };

        const correctedResponse: CorrectedResponse = correctedResponseData;

        const result = parseTripAttributes(tripAttributes, correctedResponse);
        Object.keys(expectedFields).forEach((key) => {
            expect(result[key as keyof ExtendedTripAttributes]).toBe(expectedFields[key as keyof typeof expectedFields]);
        });
    });

    it('should preserve other trip attributes', () => {
        const tripAttributes: ExtendedTripAttributes = {
            _uuid: 'test-trip-uuid',
            _sequence: 1,
            departureTime: 28800,
            arrivalTime: 32400,
            mode: 'transit',
            purpose: 'work',
            origin_geography: {
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [-73.5673, 45.5017]
                },
                properties: {}
            },
            destination_geography: {
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [-73.5500, 45.5100]
                },
                properties: {}
            }
        };

        const correctedResponse: CorrectedResponse = {
            _assignedDay: '2025-01-15'
        };

        const result = parseTripAttributes(tripAttributes, correctedResponse);

        // Should update time/date fields
        expect(result.startTime).toBe(28800);
        expect(result.endTime).toBe(32400);
        expect(result.startDate).toBe('2025-01-15');
        expect(result.endDate).toBe('2025-01-15');

        // Should preserve other attributes
        expect(result._uuid).toBe('test-trip-uuid');
        expect(result._sequence).toBe(1);
        expect(result.mode).toBe('transit');
        expect(result.purpose).toBe('work');
        expect(result.origin_geography).toBeDefined();
        expect(result.destination_geography).toBeDefined();
    });

    it('should handle zero values for times correctly', () => {
        const tripAttributes: ExtendedTripAttributes = {
            _uuid: 'test-trip-uuid',
            departureTime: 0, // Midnight
            arrivalTime: 0
        };

        const correctedResponse: CorrectedResponse = {
            _assignedDay: '2025-01-15'
        };

        const result = parseTripAttributes(tripAttributes, correctedResponse);

        expect(result.startTime).toBe(0);
        expect(result.endTime).toBe(0);
    });

    it('should handle null corrected_response gracefully', () => {
        const tripAttributes: ExtendedTripAttributes = {
            _uuid: 'test-trip-uuid',
            departureTime: 28800,
            arrivalTime: 32400
        };

        const correctedResponse: CorrectedResponse = null as unknown as CorrectedResponse;

        const result = parseTripAttributes(tripAttributes, correctedResponse);
        expect(result.startTime).toBe(28800);
        expect(result.endTime).toBe(32400);
        expect(result.startDate).toBeUndefined();
        expect(result.endDate).toBeUndefined();
    });

    it('should handle complex trip scenarios', () => {
        const tripAttributes: ExtendedTripAttributes = {
            _uuid: 'test-trip-uuid',
            _sequence: 2,
            departureTime: 61200, // 5:00 PM
            arrivalTime: 63000, // 5:30 PM
            mode: 'carDriver',
            purpose: 'shopping'
        };

        const correctedResponse: CorrectedResponse = {
            _assignedDay: '2025-01-20',
        };

        const result = parseTripAttributes(tripAttributes, correctedResponse);

        expect(result.startTime).toBe(61200);
        expect(result.endTime).toBe(63000);
        expect(result.startDate).toBe('2025-01-20');
        expect(result.endDate).toBe('2025-01-20');
        expect(result.mode).toBe('carDriver');
        expect(result.purpose).toBe('shopping');
    });
});
