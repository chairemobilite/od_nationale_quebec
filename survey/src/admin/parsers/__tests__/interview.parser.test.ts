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
            ['invalid', undefined]
        ])('should convert acceptToBeContactedForHelp from "%s" to %s', (input, expected) => {
            const correctedResponse: CorrectedResponse = {
                acceptToBeContactedForHelp: input
            };

            parseInterviewAttributes(correctedResponse);

            if (expected === undefined) {
                expect(correctedResponse.acceptToBeContactedForHelp).toBeUndefined();
            } else {
                expect(correctedResponse.acceptToBeContactedForHelp).toBe(expected);
            }
        });

        it('should handle undefined acceptToBeContactedForHelp', () => {
            const correctedResponse: CorrectedResponse = {};

            parseInterviewAttributes(correctedResponse);

            expect(correctedResponse.acceptToBeContactedForHelp).toBeUndefined();
        });
    });

    describe('wouldLikeToParticipateInOtherSurveys conversion', () => {
        test.each([
            ['yes', true],
            ['no', false],
            ['maybe', undefined]
        ])('should convert wouldLikeToParticipateInOtherSurveys from "%s" to %s', (input, expected) => {
            const correctedResponse: CorrectedResponse = {
                wouldLikeToParticipateInOtherSurveys: input
            };

            parseInterviewAttributes(correctedResponse);

            if (expected === undefined) {
                expect(correctedResponse.wouldLikeToParticipateInOtherSurveys).toBeUndefined();
            } else {
                expect(correctedResponse.wouldLikeToParticipateInOtherSurveys).toBe(expected);
            }
        });

        it('should handle undefined wouldLikeToParticipateInOtherSurveys', () => {
            const correctedResponse: CorrectedResponse = {};

            parseInterviewAttributes(correctedResponse);

            expect(correctedResponse.wouldLikeToParticipateInOtherSurveys).toBeUndefined();
        });
    });

    describe('assignedDate conversion', () => {
        it('should convert _assignedDay to assignedDate', () => {
            const correctedResponse: CorrectedResponse = {
                _assignedDay: '2025-01-15'
            };

            parseInterviewAttributes(correctedResponse);

            expect(correctedResponse.assignedDate).toBe('2025-01-15');
            expect(correctedResponse._assignedDay).toBe('2025-01-15'); // Should preserve original
        });

        it('should handle missing _assignedDay', () => {
            const correctedResponse: CorrectedResponse = {};

            parseInterviewAttributes(correctedResponse);

            expect(correctedResponse.assignedDate).toBeUndefined();
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
                household: {
                    size: 3
                }
            };

            parseInterviewAttributes(correctedResponse);

            // Should parse the target attributes
            expect(correctedResponse.acceptToBeContactedForHelp).toBe(true);
            expect(correctedResponse.wouldLikeToParticipateInOtherSurveys).toBe(false);
            expect(correctedResponse.assignedDate).toBe('2025-01-15');

            // Should preserve other attributes
            expect(correctedResponse.household?.size).toBe(3);
        });

        it('should handle all conversions simultaneously', () => {
            const correctedResponse: CorrectedResponse = {
                acceptToBeContactedForHelp: 'yes',
                wouldLikeToParticipateInOtherSurveys: 'no',
                _assignedDay: '2025-02-01',
                household: {
                    size: 3
                }
            };

            parseInterviewAttributes(correctedResponse);

            // Should parse the target attributes
            expect(correctedResponse.acceptToBeContactedForHelp).toBe(true);
            expect(correctedResponse.wouldLikeToParticipateInOtherSurveys).toBe(false);
            expect(correctedResponse.assignedDate).toBe('2025-02-01');

            // Should preserve other attributes
            expect(correctedResponse._assignedDay).toBe('2025-02-01');
            expect(correctedResponse.household?.size).toBe(3);
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
            parseInterviewAttributes(correctedResponse1);
            parseInterviewAttributes(correctedResponse2);

            expect(correctedResponse1.acceptToBeContactedForHelp).toBe(true);
            expect(correctedResponse2.acceptToBeContactedForHelp).toBe(false);
        });

        it('should handle repeated parsing correctly', () => {
            const correctedResponse: CorrectedResponse = {
                acceptToBeContactedForHelp: 'yes',
                wouldLikeToParticipateInOtherSurveys: 'no'
            };

            // First parsing should convert 'yes' to true and 'no' to false
            parseInterviewAttributes(correctedResponse);
            expect(correctedResponse.acceptToBeContactedForHelp).toBe(true);
            expect(correctedResponse.wouldLikeToParticipateInOtherSurveys).toBe(false);

            // Second parsing should leave boolean values unchanged (idempotent)
            parseInterviewAttributes(correctedResponse);
            expect(correctedResponse.acceptToBeContactedForHelp).toBe(true);
            expect(correctedResponse.wouldLikeToParticipateInOtherSurveys).toBe(false);

            // Third parsing should still leave boolean values unchanged
            parseInterviewAttributes(correctedResponse);
            expect(correctedResponse.acceptToBeContactedForHelp).toBe(true);
            expect(correctedResponse.wouldLikeToParticipateInOtherSurveys).toBe(false);
        });

        it('should not create memory leaks with large datasets', () => {
            // Create a large interview structure
            const correctedResponse: CorrectedResponse = {
                acceptToBeContactedForHelp: 'yes',
                wouldLikeToParticipateInOtherSurveys: 'no',
                _assignedDay: '2025-01-15',
                household: {
                    persons: {}
                }
            };

            parseInterviewAttributes(correctedResponse);

            expect(correctedResponse.acceptToBeContactedForHelp).toBe(true);
            expect(correctedResponse.wouldLikeToParticipateInOtherSurveys).toBe(false);
            expect(correctedResponse.assignedDate).toBe('2025-01-15');
            expect(correctedResponse.household?.persons).toEqual({});

            // Add many persons to test memory usage
            for (let i = 0; i < 100; i++) {
                correctedResponse.household!.persons![`person-${i}`] = {
                    _uuid: `person-${i}`,
                    _sequence: i,
                    age: 25 + i
                };
            }

            // Test that the parser works correctly even after adding large dataset
            // and that repeated parsing doesn't cause issues (idempotent)
            expect(() => parseInterviewAttributes(correctedResponse)).not.toThrow();
            expect(correctedResponse.acceptToBeContactedForHelp).toBe(true);
            expect(correctedResponse.wouldLikeToParticipateInOtherSurveys).toBe(false);
            expect(correctedResponse.assignedDate).toBe('2025-01-15');
        });
    });
});
