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
        ])('should convert end.wouldLikeToParticipateInOtherSurveysChaireMobilite from "%s" to %s', (input, expected) => {
            const correctedResponse: CorrectedResponse = {
                end: {
                    wouldLikeToParticipateInOtherSurveysChaireMobilite: input
                }
            };

            const result = parseInterviewAttributes(correctedResponse);

            if (expected === undefined) {
                expect(result.wouldLikeToParticipateInOtherSurveys).toBeUndefined();
            } else {
                expect(result.wouldLikeToParticipateInOtherSurveys).toBe(expected);
            }
            expect(result.end?.wouldLikeToParticipateInOtherSurveysChaireMobilite).toBeUndefined();
        });

        it('should handle missing end section', () => {
            const correctedResponse: CorrectedResponse = {};

            const result = parseInterviewAttributes(correctedResponse);

            expect(result.wouldLikeToParticipateInOtherSurveys).toBeUndefined();
        });
    });

    describe('respondentComments conversion', () => {
        it('should map end.commentsOnSurvey to respondentComments', () => {
            const correctedResponse: CorrectedResponse = {
                end: {
                    commentsOnSurvey: 'This is a test comment'
                }
            };

            const result = parseInterviewAttributes(correctedResponse);

            expect(result.respondentComments).toBe('This is a test comment');
            expect(result.end?.commentsOnSurvey).toBeUndefined();
        });

        it('should leave respondentComments unchanged when end.commentsOnSurvey is missing', () => {
            const correctedResponse: CorrectedResponse = {
                respondentComments: 'Already parsed'
            };

            const result = parseInterviewAttributes(correctedResponse);

            expect(result.respondentComments).toBe('Already parsed');
        });
    });

    describe('assignedDate conversion', () => {
        it('should convert _assignedDay to assignedDate', () => {
            const correctedResponse: CorrectedResponse = {
                _assignedDay: '2025-01-15'
            };

            const result = parseInterviewAttributes(correctedResponse);

            expect(result.assignedDate).toBe('2025-01-15');
            expect(result._assignedDay).toBeUndefined();
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

            if (description === 'null') {
                expect(correctedResponse).toBeNull();
            } else {
                expect(correctedResponse).toBeUndefined();
            }
        });
    });

    describe('comprehensive parsing', () => {
        it('should parse interview and end-section fields from a corrected response', () => {
            const correctedResponse: CorrectedResponse = {
                acceptToBeContactedForHelp: 'yes',
                _assignedDay: '2025-01-15',
                _language: 'fr',
                end: {
                    wouldLikeToParticipateInOtherSurveysChaireMobilite: 'no',
                    commentsOnSurvey: 'This is a test comment'
                },
                household: {
                    size: 3
                }
            };

            const result = parseInterviewAttributes(correctedResponse);

            expect(result.acceptToBeContactedForHelp).toBe(true);
            expect(result.wouldLikeToParticipateInOtherSurveys).toBe(false);
            expect(result.assignedDate).toBe('2025-01-15');
            expect(result._languages).toEqual(['fr']);
            expect(result.respondentComments).toBe('This is a test comment');
            expect(result._assignedDay).toBeUndefined();
            expect(result._language).toBeUndefined();
            expect(result.end?.commentsOnSurvey).toBeUndefined();
            expect(result.end?.wouldLikeToParticipateInOtherSurveysChaireMobilite).toBeUndefined();
            expect(result.household?.size).toBe(3);
        });
    });

    describe('edge cases and performance', () => {
        it('should handle repeated parsing correctly', () => {
            const correctedResponse: CorrectedResponse = {
                acceptToBeContactedForHelp: 'yes',
                _language: 'fr',
                end: {
                    wouldLikeToParticipateInOtherSurveysChaireMobilite: 'no',
                    commentsOnSurvey: 'This is a test comment'
                }
            };

            const result1 = parseInterviewAttributes(correctedResponse);
            const result2 = parseInterviewAttributes(result1);
            const result3 = parseInterviewAttributes(result2);

            expect(result3.acceptToBeContactedForHelp).toBe(true);
            expect(result3.wouldLikeToParticipateInOtherSurveys).toBe(false);
            expect(result3._languages).toEqual(['fr']);
            expect(result3.respondentComments).toBe('This is a test comment');
        });

        it('should not create memory leaks with large datasets', () => {
            const correctedResponse: CorrectedResponse = {
                acceptToBeContactedForHelp: 'yes',
                _assignedDay: '2025-01-15',
                _language: 'en',
                end: {
                    wouldLikeToParticipateInOtherSurveysChaireMobilite: 'no',
                    commentsOnSurvey: 'This is a test comment'
                },
                household: {
                    persons: {}
                }
            };

            const result = parseInterviewAttributes(correctedResponse);

            for (let i = 0; i < 100; i++) {
                result.household!.persons![`person-${i}`] = {
                    _uuid: `person-${i}`,
                    _sequence: i,
                    age: 25 + i
                };
            }

            const result2 = parseInterviewAttributes(result);

            expect(result2.acceptToBeContactedForHelp).toBe(true);
            expect(result2.wouldLikeToParticipateInOtherSurveys).toBe(false);
            expect(result2.assignedDate).toBe('2025-01-15');
            expect(result2._languages).toEqual(['en']);
            expect(result2.respondentComments).toBe('This is a test comment');
            expect(result2._assignedDay).toBeUndefined();
            expect(result2._language).toBeUndefined();
            expect(result2.end?.commentsOnSurvey).toBeUndefined();
        });
    });
});
