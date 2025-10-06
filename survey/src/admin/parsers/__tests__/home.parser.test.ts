/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { parseHomeAttributes } from '../home.parser';
import { CorrectedResponse, InterviewAttributes } from 'evolution-common/lib/services/questionnaire/types';

describe('parseHomeAttributes', () => {
    it('should convert flat address fields to Address object structure', () => {
        const homeAttributes = {
            address: '123 Main Street',
            city: 'Montreal',
            region: 'Quebec',
            country: 'Canada',
            postalCode: 'H1A 1A1'
        };

        const result = parseHomeAttributes(homeAttributes, { uuid: 'test' } as CorrectedResponse);

        expect(result).toEqual({
            address: {
                fullAddress: '123 Main Street',
                municipalityName: 'Montreal',
                region: 'Quebec',
                country: 'Canada',
                postalCode: 'H1A 1A1'
            }
        });
    });

    it('should handle partial address data', () => {
        const homeAttributes = {
            address: '456 Oak Avenue',
            city: 'Toronto'
            // Missing region, country, postalCode
        };

        const result = parseHomeAttributes(homeAttributes, { uuid: 'test' } as CorrectedResponse);

        expect(result).toEqual({
            address: {
                fullAddress: '456 Oak Avenue',
                municipalityName: 'Toronto'
            }
        });
    });

    test.each([
        ['undefined', undefined],
        ['null', null],
        ['string', 'string'],
        ['number', 123],
        ['boolean', true]
    ])('should handle %s homeAttributes gracefully', (_description, homeAttributes) => {
        expect(() => parseHomeAttributes(homeAttributes as any, { uuid: 'test' } as CorrectedResponse)).not.toThrow();
    });

    it('should handle home object without address fields', () => {
        const homeAttributes = {
            someOtherField: 'value',
            anotherField: 42
        };

        const result = parseHomeAttributes(homeAttributes, { uuid: 'test' } as CorrectedResponse);

        expect(result).toEqual({
            someOtherField: 'value',
            anotherField: 42
        });
    });

    it('should preserve other home fields when converting address', () => {
        const homeAttributes = {
            address: '789 Pine Street',
            city: 'Vancouver',
            region: 'British Columbia',
            someOtherField: 'preserved',
            anotherField: 42,
            nestedObject: {
                property: 'value'
            }
        };

        const result = parseHomeAttributes(homeAttributes, { uuid: 'test' } as CorrectedResponse);

        expect(result).toEqual({
            address: {
                fullAddress: '789 Pine Street',
                municipalityName: 'Vancouver',
                region: 'British Columbia'
            },
            someOtherField: 'preserved',
            anotherField: 42,
            nestedObject: {
                property: 'value'
            }
        });
    });

    test.each([
        [
            'only address field present',
            { address: '100 Test Street' },
            { address: { fullAddress: '100 Test Street' } }
        ],
        [
            'only city field present',
            { city: 'Quebec City' },
            { address: { municipalityName: 'Quebec City' } }
        ]
    ])('should handle %s', (description, homeAttributes, expected) => {
        const result = parseHomeAttributes(homeAttributes, { uuid: 'test' } as CorrectedResponse);
        expect(result).toEqual(expected);
    });

    it('should handle only region, country, and postalCode without address or city', () => {
        const homeAttributes = {
            region: 'Ontario',
            country: 'Canada',
            postalCode: 'K1A 0A6'
        };

        const result = parseHomeAttributes(homeAttributes, { uuid: 'test' } as CorrectedResponse);

        expect(result).toEqual({
            address: {
                region: 'Ontario',
                country: 'Canada',
                postalCode: 'K1A 0A6'
            }
        });
    });

    test.each([
        [
            'empty string values',
            {
                address: '',
                city: 'Montreal',
                region: '',
                country: 'Canada',
                postalCode: ''
            },
            {
                address: {
                    municipalityName: 'Montreal',
                    country: 'Canada'
                }
            }
        ],
        [
            'null and undefined field values',
            {
                address: null,
                city: 'Toronto',
                region: undefined,
                country: 'Canada',
                postalCode: null
            },
            {
                address: {
                    municipalityName: 'Toronto',
                    country: 'Canada'
                }
            }
        ]
    ])('should handle %s', (description, homeAttributes, expected) => {
        const result = parseHomeAttributes(homeAttributes, { uuid: 'test' } as CorrectedResponse);
        expect(result).toEqual(expected);
    });

    it('should work with interview attributes parameter (though not used)', () => {
        const homeAttributes = {
            address: '123 Test Street',
            city: 'Montreal'
        };

        const interviewAttributes: InterviewAttributes = {
            uuid: 'test-interview-uuid',
            corrected_response: {
                _language: 'fr'
            }
        } as any;

        const result = parseHomeAttributes(homeAttributes, interviewAttributes);

        expect(result).toEqual({
            address: {
                fullAddress: '123 Test Street',
                municipalityName: 'Montreal'
            }
        });
    });

    it('should handle complex address scenarios', () => {
        const homeAttributes = {
            address: '1234 Rue Sainte-Catherine Ouest, Apt 5B',
            city: 'Montréal',
            region: 'Québec',
            country: 'Canada',
            postalCode: 'H3G 1P1',
            homeType: 'apartment',
            yearBuilt: 1985,
            numberOfRooms: 4
        };

        const result = parseHomeAttributes(homeAttributes, { uuid: 'test' } as CorrectedResponse);

        expect(result).toEqual({
            address: {
                fullAddress: '1234 Rue Sainte-Catherine Ouest, Apt 5B',
                municipalityName: 'Montréal',
                region: 'Québec',
                country: 'Canada',
                postalCode: 'H3G 1P1'
            },
            homeType: 'apartment',
            yearBuilt: 1985,
            numberOfRooms: 4
        });
    });

    it('should handle address fields with different data types', () => {
        const homeAttributes = {
            address: 123, // Number instead of string
            city: 'Montreal',
            region: true, // Boolean instead of string
            country: 'Canada',
            postalCode: 'H1A, 1A1' // Array instead of string
        };

        const result = parseHomeAttributes(homeAttributes, { uuid: 'test' } as CorrectedResponse);

        expect(result).toEqual({
            address: {
                fullAddress: '123',
                municipalityName: 'Montreal',
                region: 'true',
                country: 'Canada',
                postalCode: 'H1A, 1A1'
            }
        });
    });

    // Immutability tests
    describe('immutability', () => {
        it('should not modify the original homeAttributes object', () => {
            const originalHomeAttributes = {
                address: '123 Main Street',
                city: 'Montreal',
                region: 'Quebec',
                country: 'Canada',
                postalCode: 'H1A 1A1',
                someOtherField: 'preserved'
            };

            // Create a deep copy to compare against
            const originalCopy = JSON.parse(JSON.stringify(originalHomeAttributes));

            const result = parseHomeAttributes(originalHomeAttributes, { uuid: 'test' } as CorrectedResponse);

            // Original should remain unchanged
            expect(originalHomeAttributes).toEqual(originalCopy);

            // Result should be different from original
            expect(result).not.toEqual(originalHomeAttributes);
            expect(result).toEqual({
                address: {
                    fullAddress: '123 Main Street',
                    municipalityName: 'Montreal',
                    region: 'Quebec',
                    country: 'Canada',
                    postalCode: 'H1A 1A1'
                },
                someOtherField: 'preserved'
            });
        });

        it('should not modify the correctedResponse parameter', () => {
            const homeAttributes = {
                address: '456 Oak Avenue',
                city: 'Toronto'
            };

            const originalCorrectedResponse = { uuid: 'test', someField: 'value' };
            const correctedResponseCopy = JSON.parse(JSON.stringify(originalCorrectedResponse));

            parseHomeAttributes(homeAttributes, originalCorrectedResponse as CorrectedResponse);

            // correctedResponse should remain unchanged
            expect(originalCorrectedResponse).toEqual(correctedResponseCopy);
        });

        it('should handle nested objects without modifying originals', () => {
            const homeAttributes = {
                address: '789 Pine Street',
                city: 'Vancouver',
                nestedObject: {
                    property: 'value',
                    deepNested: {
                        level: 2
                    }
                }
            };

            const originalCopy = JSON.parse(JSON.stringify(homeAttributes));

            const result = parseHomeAttributes(homeAttributes, { uuid: 'test' } as CorrectedResponse);

            // Original should remain unchanged
            expect(homeAttributes).toEqual(originalCopy);

            // Result should have processed address but preserved nested structure
            expect(result.nestedObject).toEqual({
                property: 'value',
                deepNested: {
                    level: 2
                }
            });
            expect(result.nestedObject).not.toBe(homeAttributes.nestedObject); // Different reference
        });
    });
});
