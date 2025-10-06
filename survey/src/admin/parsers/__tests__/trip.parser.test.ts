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
            'startTime from departureTime',
            { departureTime: 28800, arrivalTime: 32400 },
            { startTime: 28800, endTime: 32400 }
        ],
        [
            'endTime from arrivalTime',
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

        parseTripAttributes(tripAttributes, correctedResponse);

        Object.keys(expectedFields).forEach((key) => {
            expect(tripAttributes[key as keyof ExtendedTripAttributes]).toBe(expectedFields[key as keyof typeof expectedFields]);
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

        parseTripAttributes(tripAttributes, correctedResponse);

        expect(tripAttributes.startDate).toBe('2025-01-15');
        expect(tripAttributes.endDate).toBe('2025-01-15');
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

        parseTripAttributes(tripAttributes, correctedResponse);

        Object.keys(expectedFields).forEach((key) => {
            expect(tripAttributes[key as keyof ExtendedTripAttributes]).toBe(expectedFields[key as keyof typeof expectedFields]);
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
        const tripAttributes: ExtendedTripAttributes = {
            _uuid: 'test-trip-uuid',
            departureTime: 28800,
            arrivalTime: 32400
        };

        const correctedResponse: CorrectedResponse = correctedResponseData;

        expect(() => parseTripAttributes(tripAttributes, correctedResponse)).not.toThrow();

        Object.keys(expectedFields).forEach((key) => {
            expect(tripAttributes[key as keyof ExtendedTripAttributes]).toBe(expectedFields[key as keyof typeof expectedFields]);
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

        parseTripAttributes(tripAttributes, correctedResponse);

        // Should update time/date fields
        expect(tripAttributes.startTime).toBe(28800);
        expect(tripAttributes.endTime).toBe(32400);
        expect(tripAttributes.startDate).toBe('2025-01-15');
        expect(tripAttributes.endDate).toBe('2025-01-15');

        // Should preserve other attributes
        expect(tripAttributes._uuid).toBe('test-trip-uuid');
        expect(tripAttributes._sequence).toBe(1);
        expect(tripAttributes.mode).toBe('transit');
        expect(tripAttributes.purpose).toBe('work');
        expect(tripAttributes.origin_geography).toBeDefined();
        expect(tripAttributes.destination_geography).toBeDefined();
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

        parseTripAttributes(tripAttributes, correctedResponse);

        expect(tripAttributes.startTime).toBe(0);
        expect(tripAttributes.endTime).toBe(0);
    });

    it('should handle null corrected_response gracefully', () => {
        const tripAttributes: ExtendedTripAttributes = {
            _uuid: 'test-trip-uuid',
            departureTime: 28800,
            arrivalTime: 32400
        };

        const correctedResponse = null as any;

        expect(() => parseTripAttributes(tripAttributes, correctedResponse)).not.toThrow();

        expect(tripAttributes.startTime).toBe(28800);
        expect(tripAttributes.endTime).toBe(32400);
        expect(tripAttributes.startDate).toBeUndefined();
        expect(tripAttributes.endDate).toBeUndefined();
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

        parseTripAttributes(tripAttributes, correctedResponse);

        expect(tripAttributes.startTime).toBe(61200);
        expect(tripAttributes.endTime).toBe(63000);
        expect(tripAttributes.startDate).toBe('2025-01-20');
        expect(tripAttributes.endDate).toBe('2025-01-20');
        expect(tripAttributes.mode).toBe('carDriver');
        expect(tripAttributes.purpose).toBe('shopping');
    });
});
