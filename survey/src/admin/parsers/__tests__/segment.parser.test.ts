/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidV4 } from 'uuid';

import { parseSegmentAttributes } from '../segment.parser';
import { ExtendedSegmentAttributes } from 'evolution-common/lib/services/baseObjects/Segment';
import { CorrectedResponse } from 'evolution-common/lib/services/questionnaire/types';

describe('parseSegmentAttributes', () => {
    const correctedResponse: CorrectedResponse = { _assignedDay: '2025-01-15' };

    const parse = (answers: { [key: string]: unknown }): ExtendedSegmentAttributes =>
        parseSegmentAttributes(
            { _uuid: 'test-segment-uuid', mode: 'carDriver', ...answers } as ExtendedSegmentAttributes,
            correctedResponse
        );

    test.each([
        ['paid', 'yes', { status: 'answered', value: true }],
        ['not paid', 'no', { status: 'answered', value: false }],
        ['not known', 'dontKnow', { status: 'dont_know' }]
    ])('should convert the parking choice for %s', (_description, choice, expected) => {
        expect(parse({ paidForParking: choice }).paidForParking).toEqual(expected);
    });

    test.each([
        ['no parking answer', undefined],
        ['an answer already wrapped', { status: 'refusal' }]
    ])('should leave %s as it is', (_description, paidForParking) => {
        expect(parse({ paidForParking }).paidForParking).toEqual(paidForParking);
    });

    const householdMemberUuid = uuidV4();

    test.each([
        ['a member of the household', householdMemberUuid, 'householdMember', householdMemberUuid],
        ['friend or family', 'familyMember', 'familyMember', undefined],
        ['a colleague', 'colleague', 'colleague', undefined],
        ['a taxi driver', 'taxiDriver', 'taxiDriver', undefined],
        ['a paratransit driver', 'paratransit', 'paratransit', undefined],
        ['a carpool driver', 'carpool', 'carpool', undefined],
        ['no driver answer', undefined, undefined, undefined]
    ])('should read the driver answer for %s', (_description, driver, expectedType, expectedUuid) => {
        const result = parse({ driver });

        expect(result.driverType).toEqual(expectedType);
        expect(result.driverUuid).toEqual(expectedUuid);
    });
});
