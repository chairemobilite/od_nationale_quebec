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

        parseVisitedPlaceAttributes(visitedPlaceAttributes, correctedResponse);

        Object.keys(expectedFields).forEach((key) => {
            expect(visitedPlaceAttributes[key as keyof ExtendedVisitedPlaceAttributes]).toBe(expectedFields[key as keyof typeof expectedFields]);
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

        parseVisitedPlaceAttributes(visitedPlaceAttributes, correctedResponse);

        expect(visitedPlaceAttributes.startDate).toBe('2025-01-15');
        expect(visitedPlaceAttributes.endDate).toBe('2025-01-15');
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

        parseVisitedPlaceAttributes(visitedPlaceAttributes, correctedResponse);

        Object.keys(expectedFields).forEach((key) => {
            expect(visitedPlaceAttributes[key as keyof ExtendedVisitedPlaceAttributes]).toBe(expectedFields[key as keyof typeof expectedFields]);
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

        expect(() => parseVisitedPlaceAttributes(visitedPlaceAttributes, correctedResponse)).not.toThrow();

        Object.keys(expectedFields).forEach((key) => {
            expect(visitedPlaceAttributes[key as keyof ExtendedVisitedPlaceAttributes]).toBe(expectedFields[key as keyof typeof expectedFields]);
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

        parseVisitedPlaceAttributes(visitedPlaceAttributes, correctedResponse);

        // Should update time/date fields
        expect(visitedPlaceAttributes.startTime).toBe(28800);
        expect(visitedPlaceAttributes.endTime).toBe(32400);
        expect(visitedPlaceAttributes.startDate).toBe('2025-01-15');
        expect(visitedPlaceAttributes.endDate).toBe('2025-01-15');

        // Should preserve other attributes
        expect(visitedPlaceAttributes._uuid).toBe('test-visited-place-uuid');
        expect(visitedPlaceAttributes._sequence).toBe(1);
        expect(visitedPlaceAttributes.activity).toBe('work');
        expect(visitedPlaceAttributes.geography).toBeDefined();
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

        parseVisitedPlaceAttributes(visitedPlaceAttributes, correctedResponse);

        expect(visitedPlaceAttributes.startTime).toBe(0);
        expect(visitedPlaceAttributes.endTime).toBe(0);
    });

    it('should handle null corrected_response gracefully', () => {
        const visitedPlaceAttributes: ExtendedVisitedPlaceAttributes = {
            _uuid: 'test-visited-place-uuid',
            arrivalTime: 28800,
            departureTime: 32400
        };

        const correctedResponse =null as any;

        expect(() => parseVisitedPlaceAttributes(visitedPlaceAttributes, correctedResponse)).not.toThrow();

        expect(visitedPlaceAttributes.startTime).toBe(28800);
        expect(visitedPlaceAttributes.endTime).toBe(32400);
        expect(visitedPlaceAttributes.startDate).toBeUndefined();
        expect(visitedPlaceAttributes.endDate).toBeUndefined();
    });
});
