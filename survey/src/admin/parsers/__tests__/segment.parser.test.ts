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
        {
            description: 'paid',
            choice: 'yes',
            expected: { status: 'answered', value: true }
        },
        {
            description: 'not paid',
            choice: 'no',
            expected: { status: 'answered', value: false }
        },
        {
            description: 'not known',
            choice: 'dontKnow',
            expected: { status: 'dont_know' }
        }
    ])('should convert the parking choice for $description', ({ choice, expected }) => {
        expect(parse({ paidForParking: choice }).paidForParking).toEqual(expected);
    });

    test.each([
        {
            description: 'no parking answer',
            paidForParking: undefined
        },
        {
            description: 'an answer already wrapped',
            paidForParking: { status: 'refusal' }
        },
        {
            description: 'an unrecognized parking choice',
            paidForParking: 'noPark'
        }
    ])('should leave $description as it is', ({ paidForParking }) => {
        expect(parse({ paidForParking }).paidForParking).toEqual(paidForParking);
    });

    const householdMemberUuid = uuidV4();

    test.each([
        {
            description: 'a member of the household',
            driver: householdMemberUuid,
            expected: { driverType: 'householdMember', driverUuid: householdMemberUuid }
        },
        {
            description: 'a family member',
            driver: 'familyMember',
            expected: { driverType: 'familyMember', driverUuid: undefined }
        },
        {
            description: 'a colleague',
            driver: 'colleague',
            expected: { driverType: 'colleague', driverUuid: undefined }
        },
        {
            description: 'a taxi driver',
            driver: 'taxiDriver',
            expected: { driverType: 'taxiDriver', driverUuid: undefined }
        },
        {
            description: 'a transit taxi driver',
            driver: 'transitTaxiDriver',
            expected: { driverType: 'transitTaxiDriver', driverUuid: undefined }
        },
        {
            description: 'a paratransit driver',
            driver: 'paratransit',
            expected: { driverType: 'paratransit', driverUuid: undefined }
        },
        {
            description: 'a carpool driver',
            driver: 'carpool',
            expected: { driverType: 'carpool', driverUuid: undefined }
        },
        {
            description: 'another driver',
            driver: 'other',
            expected: { driverType: 'other', driverUuid: undefined }
        },
        {
            description: 'an unknown driver',
            driver: 'dontKnow',
            expected: { driverType: 'dontKnow', driverUuid: undefined }
        },
        {
            description: 'no driver answer',
            driver: undefined,
            expected: { driverType: undefined, driverUuid: undefined }
        },
        {
            description: 'an unsupported driver choice',
            driver: 'neighbor',
            expected: { driverType: undefined, driverUuid: undefined }
        }
    ])('should read the driver answer for $description', ({ driver, expected }) => {
        const result = parse({ driver });

        expect({
            driverType: result.driverType,
            driverUuid: result.driverUuid
        }).toEqual(expected);
        expect(result.driver).toEqual(driver);
    });
});
