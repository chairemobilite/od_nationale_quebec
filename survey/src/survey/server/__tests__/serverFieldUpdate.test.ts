
import updateCallbacks from '../serverFieldUpdate';
import _cloneDeep from 'lodash/cloneDeep';
import each from 'jest-each';
import { getPreFilledResponseByPath } from 'evolution-backend/lib/services/interviews/serverFieldUpdate';
import { InterviewAttributes } from 'evolution-common/lib/services/questionnaire/types';
import '../serverValidations'; // Make sure access code format validation is registered

jest.mock('evolution-backend/lib/services/interviews/serverFieldUpdate', () => ({
    getPreFilledResponseByPath: jest.fn().mockResolvedValue({})
}));
const preFilledMock = getPreFilledResponseByPath as jest.MockedFunction<typeof getPreFilledResponseByPath>;

const baseInterview: InterviewAttributes = {
    response: {
        household: {
            size: 1,
            tripsDate: '2022-09-26',
            persons: {
                a12345: {
                    age: 56,
                    gender: 'female',
                    occupation: 'fullTimeStudent',
                    visitedPlaces: {
                        p1: {
                            geography: { type: 'Feature', geometry: { type: 'Point', coordinates: [-73.1, 45.1] }, properties: { lastAction: 'shortcut' }},
                            activity: 'service',
                            arrivalTime: 42900,
                            departureTime: 45000,
                            nextPlaceCategory: 'visitedAnotherPlace'
                        } as any,
                        p2: {
                            geography: { type: 'Feature', geometry: { type: 'Point', coordinates: [-73.3, 45.0] }, properties: { lastAction: 'shortcut' }},
                            activity: 'service',
                            arrivalTime: 46800,
                            departureTime: 54000,
                            nextPlaceCategory: 'visitedAnotherPlace'
                        } as any
                    },
                    trips: {
                        t1: {
                            _originVisitedPlaceUuid: 'p1',
                            _destinationVisitedPlaceUuid: 'p2',
                            segments: {
                                s1: {
                                    _sequence: 1,
                                    mode: 'transitBus'
                                }
                            }
                        }
                    }
                } as any
            }
        } as any,
        previousDay: '2022-09-12',
        previousBusinessDay: '2022-09-12',
        _activePersonId: 'a12345'
    },
    id: 1,
    uuid: 'arbitrary',
    participant_id: 1,
    is_completed: false,
    validations: {},
    is_valid: true
};

beforeEach(() => {
    jest.clearAllMocks();
});

describe('access code update', function () {
    const updateCallback = (updateCallbacks.find((callback) => callback.field === 'accessCode') as any).callback;
    
    test('properly formatted access code, with data', async () => {
        const interview = _cloneDeep(baseInterview);

        // Prepare data to return
        const prefillData = {
            'home.address': '123 Main St',
            'home.city': 'Montreal',
            'home.postalCode': 'H1A 1A1',
            'home._addressIsPrefilled': true
        }
        preFilledMock.mockResolvedValueOnce(prefillData);
        const updateResult = await updateCallback(interview, '1111-1111');

        expect(preFilledMock).toHaveBeenCalledWith('1111-1111', interview);
        expect(updateResult).toEqual({ ...prefillData, accessCodeConfirmed: true });
        
    });

    each([
        ['11111111', '1111-1111'],
        ['1111 1111', '1111-1111'],
        ['1111  1111', '1111-1111'],
    ]).test('access code to reformat, without data %s', async (accessCode, expected) => {
        const interview = _cloneDeep(baseInterview);

        const updateResult = await updateCallback(interview, accessCode);
        expect(preFilledMock).toHaveBeenCalledWith(expected, interview);
        expect(updateResult).toEqual({ accessCode: expected, accessCodeConfirmed: true });
    });

    test('undefined access code', async() => {
        const interview = _cloneDeep(baseInterview);

        expect(await updateCallback(interview, undefined)).toEqual({ });
        expect(preFilledMock).not.toHaveBeenCalled();
    });

    test('invalid access code', async() => {
        const interview = _cloneDeep(baseInterview);

        expect(await updateCallback(interview, 'invalid')).toEqual({ });
        expect(preFilledMock).not.toHaveBeenCalled();
    });

    test('already confirmed access code', async() => {
        const interview = _cloneDeep(baseInterview);
        interview.response.accessCodeConfirmed = true;

        expect(await updateCallback(interview, '1111-1111')).toEqual({ });
        expect(preFilledMock).not.toHaveBeenCalled();
    });

    test('error in get prefilled', async () => {
        const interview = _cloneDeep(baseInterview);

        preFilledMock.mockRejectedValueOnce(new Error('Error getting prefilled data'));
        const updateResult = await updateCallback(interview, '11111111');
        expect(preFilledMock).toHaveBeenCalledWith('1111-1111', interview);
        expect(updateResult).toEqual({ });
    });

});