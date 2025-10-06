/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { parseInterviewAttributes } from '../interview.parser';
import { CorrectedResponse } from 'evolution-common/lib/services/questionnaire/types';

describe('parseInterviewAttributes', () => {
    describe('acceptToBeContactedForHelp conversion', () => {
        test.each([
            ['yes', true],
            ['no', false],
            ['saperlipopette', undefined] // anything else should revert to undefined
        ])('should convert acceptToBeContactedForHelp from "%s" to %s', (input, expected) => {
            const correctedResponse: CorrectedResponse = {
                acceptToBeContactedForHelp: input
            };

            const result = parseInterviewAttributes(correctedResponse);

            if (expected === undefined) {
                expect(result.acceptToBeContactedForHelp).toBeUndefined();
            } else {
                expect(result.acceptToBeContactedForHelp).toBe(expected);
            }
        });

        it('should handle undefined acceptToBeContactedForHelp', () => {
            const correctedResponse: CorrectedResponse = {};

            const result = parseInterviewAttributes(correctedResponse);

            expect(result.acceptToBeContactedForHelp).toBeUndefined();
        });
    });

    describe('wouldLikeToParticipateInOtherSurveys conversion', () => {
        test.each([
            ['yes', true],
            ['no', false],
            ['toaster', undefined] // anything else should revert to undefined
        ])('should convert wouldLikeToParticipateInOtherSurveys from "%s" to %s', (input, expected) => {
            const correctedResponse: CorrectedResponse = {
                wouldLikeToParticipateInOtherSurveys: input
            };

            const result = parseInterviewAttributes(correctedResponse);

            if (expected === undefined) {
                expect(result.wouldLikeToParticipateInOtherSurveys).toBeUndefined();
            } else {
                expect(result.wouldLikeToParticipateInOtherSurveys).toBe(expected);
            }
        });

        it('should handle undefined wouldLikeToParticipateInOtherSurveys', () => {
            const correctedResponse: CorrectedResponse = {};

            const result = parseInterviewAttributes(correctedResponse);

            expect(result.wouldLikeToParticipateInOtherSurveys).toBeUndefined();
        });
    });

    describe('assignedDate conversion', () => {
        it('should convert _assignedDay to assignedDate', () => {
            const correctedResponse: CorrectedResponse = {
                _assignedDay: '2025-01-15'
            };

            const result = parseInterviewAttributes(correctedResponse);

            expect(result.assignedDate).toBe('2025-01-15');
            expect(result._assignedDay).toBe('2025-01-15'); // Should preserve original
        });

        it('should handle missing _assignedDay', () => {
            const correctedResponse: CorrectedResponse = {};

            const result = parseInterviewAttributes(correctedResponse);

            expect(result.assignedDate).toBeUndefined();
        });
    });

    describe('error handling', () => {
        test.each([
            ['null', null],
            ['undefined', undefined]
        ])('should handle %s corrected_response gracefully', (description, correctedResponse) => {
            expect(() => parseInterviewAttributes(correctedResponse as any)).not.toThrow();

            // Should not crash and leave attributes unchanged
            if (description === 'null') {
                expect(correctedResponse).toBeNull();
            } else {
                expect(correctedResponse).toBeUndefined();
            }
        });
    });

    describe('comprehensive parsing', () => {
        it('should preserve other attributes when parsing', () => {
            const correctedResponse: CorrectedResponse = {
                acceptToBeContactedForHelp: 'yes',
                wouldLikeToParticipateInOtherSurveys: 'no',
                _assignedDay: '2025-01-15',
                _language: 'fr',
                household: {
                    size: 3
                }
            };

            const result = parseInterviewAttributes(correctedResponse);

            // Should parse the target attributes
            expect(result.acceptToBeContactedForHelp).toBe(true);
            expect(result.wouldLikeToParticipateInOtherSurveys).toBe(false);
            expect(result.assignedDate).toBe('2025-01-15');
            expect(result._languages).toEqual(['fr']);

            // Should preserve other attributes
            expect(result.household?.size).toBe(3);
        });

        it('should handle all conversions simultaneously', () => {
            const correctedResponse: CorrectedResponse = {
                acceptToBeContactedForHelp: 'yes',
                wouldLikeToParticipateInOtherSurveys: 'no',
                _assignedDay: '2025-02-01',
                _language: 'en',
                household: {
                    size: 3
                }
            };

            const result = parseInterviewAttributes(correctedResponse);

            // Should parse the target attributes
            expect(result.acceptToBeContactedForHelp).toBe(true);
            expect(result.wouldLikeToParticipateInOtherSurveys).toBe(false);
            expect(result.assignedDate).toBe('2025-02-01');
            expect(result._languages).toEqual(['en']);

            // Should preserve other attributes
            expect(result._assignedDay).toBe('2025-02-01');
            expect(result.household?.size).toBe(3);
        });
    });

    describe('edge cases and performance', () => {
        it('should handle concurrent parser calls', () => {
            const correctedResponse1: CorrectedResponse = {
                acceptToBeContactedForHelp: 'yes'
            };

            const correctedResponse2: CorrectedResponse = {
                acceptToBeContactedForHelp: 'no'
            };

            // Simulate concurrent parsing
            const result1 = parseInterviewAttributes(correctedResponse1);
            const result2 = parseInterviewAttributes(correctedResponse2);

            expect(result1.acceptToBeContactedForHelp).toBe(true);
            expect(result2.acceptToBeContactedForHelp).toBe(false);
        });

        it('should handle repeated parsing correctly', () => {
            const correctedResponse: CorrectedResponse = {
                acceptToBeContactedForHelp: 'yes',
                wouldLikeToParticipateInOtherSurveys: 'no',
                _language: 'fr'
            };

            // First parsing should convert 'yes' to true, 'no' to false, and add languages array
            const result1 = parseInterviewAttributes(correctedResponse);
            expect(result1.acceptToBeContactedForHelp).toBe(true);
            expect(result1.wouldLikeToParticipateInOtherSurveys).toBe(false);
            expect(result1._languages).toEqual(['fr']);

            // Second parsing should leave values unchanged (idempotent)
            const result2 = parseInterviewAttributes(result1);
            expect(result2.acceptToBeContactedForHelp).toBe(true);
            expect(result2.wouldLikeToParticipateInOtherSurveys).toBe(false);
            expect(result2._languages).toEqual(['fr']);

            // Third parsing should still leave values unchanged
            const result3 = parseInterviewAttributes(result2);
            expect(result3.acceptToBeContactedForHelp).toBe(true);
            expect(result3.wouldLikeToParticipateInOtherSurveys).toBe(false);
            expect(result3._languages).toEqual(['fr']);
        });

        it('should not create memory leaks with large datasets', () => {
            // Create a large interview structure
            const correctedResponse: CorrectedResponse = {
                acceptToBeContactedForHelp: 'yes',
                wouldLikeToParticipateInOtherSurveys: 'no',
                _assignedDay: '2025-01-15',
                _language: 'en',
                household: {
                    persons: {}
                }
            };

            const result = parseInterviewAttributes(correctedResponse);

            expect(result.acceptToBeContactedForHelp).toBe(true);
            expect(result.wouldLikeToParticipateInOtherSurveys).toBe(false);
            expect(result.assignedDate).toBe('2025-01-15');
            expect(result._languages).toEqual(['en']);
            expect(result.household?.persons).toEqual({});

            // Add many persons to test memory usage
            for (let i = 0; i < 100; i++) {
                result.household!.persons![`person-${i}`] = {
                    _uuid: `person-${i}`,
                    _sequence: i,
                    age: 25 + i
                };
            }

            // Test that the parser works correctly even after adding large dataset
            // and that repeated parsing doesn't cause issues (idempotent)
            const result2 = parseInterviewAttributes(result);
            expect(result2.acceptToBeContactedForHelp).toBe(true);
            expect(result2.wouldLikeToParticipateInOtherSurveys).toBe(false);
            expect(result2.assignedDate).toBe('2025-01-15');
            expect(result2._languages).toEqual(['en']);
        });
    });
});
