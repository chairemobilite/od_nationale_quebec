
import moment from 'moment-business-days';
import { ObjectReadableMock } from 'stream-mock';
import updateCallbacks, { updateAssignedDayRates } from '../serverFieldUpdate';
import _cloneDeep from 'lodash/cloneDeep';
import each from 'jest-each';
import { getPreFilledResponseByPath } from 'evolution-backend/lib/services/interviews/serverFieldUpdate';
import { InterviewAttributes } from 'evolution-common/lib/services/questionnaire/types';
import interviewsDbQueries from 'evolution-backend/lib/models/interviews.db.queries';
import RandomUtils from 'chaire-lib-common/lib/utils/RandomUtils';
import '../serverValidations'; // Make sure access code format validation is registered

jest.useFakeTimers();

jest.mock('evolution-backend/lib/models/interviews.db.queries', () => ({
    getInterviewsStream: jest.fn().mockImplementation(() => new ObjectReadableMock([]))
}));
const getInterviewStreamMock = interviewsDbQueries.getInterviewsStream as jest.MockedFunction<typeof interviewsDbQueries.getInterviewsStream>;
jest.mock('chaire-lib-common/lib/utils/RandomUtils', () => ({
    randomFromDistribution: jest.fn()
}));
const randomMock = RandomUtils.randomFromDistribution as jest.MockedFunction<typeof RandomUtils.randomFromDistribution>;

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
        _previousDay: '2022-09-12',
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
        expect(updateResult).toEqual({ ...prefillData, _accessCodeConfirmed: true });
        
    });

    each([
        ['11111111', '1111-1111'],
        ['1111 1111', '1111-1111'],
        ['1111  1111', '1111-1111'],
    ]).test('access code to reformat, without data %s', async (accessCode, expected) => {
        const interview = _cloneDeep(baseInterview);

        const updateResult = await updateCallback(interview, accessCode);
        expect(preFilledMock).toHaveBeenCalledWith(expected, interview);
        expect(updateResult).toEqual({ accessCode: expected, _accessCodeConfirmed: true });
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
        interview.response._accessCodeConfirmed = true;

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

describe('test survey day assignation', function () {

    beforeEach(() => {
        jest.clearAllMocks();
    })
    const updateCallback = (updateCallbacks.find((callback) => callback.field === '_previousDay') as any).callback;

    test('Day already assigned', async () => {
        const interview = _cloneDeep(baseInterview);
        interview.response._assignedDay = interview.response._previousDay;
        expect(await updateCallback(interview, interview.response._previousDay)).toEqual({});
        expect(randomMock).not.toHaveBeenCalled();
    });

    test('No data for days, should be previous day', async () => {
        // Prepare less than 500 interviews to be returned for the assigned day update
        const interviews: any[] = [];
        interviews.push({ response: { _assignedDay: '2022-09-09' } as any});
        interviews.push({ response: { _assignedDay: '2022-09-09' } as any});
        interviews.push({ response: { _assignedDay: '2022-09-09' } as any});
        interviews.push({ response: { } as any});
        getInterviewStreamMock.mockReturnValue(new ObjectReadableMock(interviews) as any);

        // Update the assigned day rates
        await updateAssignedDayRates();

        // Validate call to get assigned day rates, the filter should be with a completed at data, for completed and not invalid interviews
        expect(getInterviewStreamMock).toHaveBeenCalledTimes(1);
        expect(getInterviewStreamMock).toHaveBeenCalledWith({ 
            filters: { 'response._completedAt': expect.anything(), 'response._isCompleted': { value: true }, 'is_valid': { value: false, op: 'not' } },
            select: { responseType: 'correctedIfAvailable', includeAudits: false }
        });
        
        // Do the update callback with those data
        const interview = _cloneDeep(baseInterview);
        expect(await updateCallback(interview, interview.response._previousDay)).toEqual({ '_assignedDay': interview.response._previousDay, '_originalAssignedDay': interview.response._previousDay });
        expect(randomMock).not.toHaveBeenCalled();
    });

    test('No data for days, but previous days is weekend', async () => {
        randomMock.mockReturnValue(2);

        const interview = _cloneDeep(baseInterview);
        // Previous day is sunday
        expect(await updateCallback(interview, '2022-09-11')).toEqual({ '_assignedDay': '2022-09-09', '_originalAssignedDay': '2022-09-09' });
        expect(randomMock).toHaveBeenCalledTimes(1);
    });

    test('Should be called with probabilities, when more than 500 days', async() => {
        // Return 500 for previous day (monday), 100 last friday, 200 wednesday, 200 tuesday
        const interviews: any[] = [];
        for (let i = 0; i < 500; i++) {
            interviews.push({ response: { _assignedDay: '2024-09-23' }});
        };
        for (let i = 0; i < 100; i++) {
            interviews.push({ response: { _assignedDay: '2024-09-20' }});
        };
        for (let i = 0; i < 200; i++) {
            interviews.push({ response: { _assignedDay: '2024-09-19' }});
        };
        for (let i = 0; i < 200; i++) {
            interviews.push({ response: { _assignedDay: '2024-09-18' }});
        };
        getInterviewStreamMock.mockReturnValue(new ObjectReadableMock(interviews) as any);

        // Update the assigned day rates
        await updateAssignedDayRates();

        randomMock.mockReturnValue(3);

        // Use a previous day of monday
        const interview = _cloneDeep(baseInterview);
        interview.response._previousDay = '2024-09-23';
        expect(await updateCallback(interview, '2024-09-23')).toEqual({ '_assignedDay': '2024-09-20', '_originalAssignedDay': '2024-09-20' });
        expect(randomMock).toHaveBeenCalledTimes(1);
        const randomParams = randomMock.mock.calls[0];
        // Weekend should have 0 probability, but day before (monday) should have one
        expect(randomParams[0][0]).toBeGreaterThan(0);
        expect(randomParams[0][1]).toEqual(0);
        expect(randomParams[0][2]).toEqual(0);
        // 3 days ago should have higher probability
        expect(randomParams[0][3]).toBeGreaterThan(randomParams[0][0]);
        expect(randomParams[0][3]).toBeGreaterThan(randomParams[0][1]);
        expect(randomParams[0][3]).toBeGreaterThan(randomParams[0][2]);
        expect(randomParams[2]).toEqual((randomParams[0] as number[]).reduce((sum, current) => sum + current, 0));
    });

    test('With a holiday', async() => {
        // Add a holiday for october 10, 2022
        moment.updateLocale('en', {
            holidays: ['2022-10-10'],
            holidayFormat: 'YYYY-MM-DD' ,
        });
        // Return 200 for previous day (monday), 300 last friday, 200 wednesday, 200 tuesday
        const interviews: any[] = [];
        for (let i = 0; i < 200; i++) {
            interviews.push({ response: { _assignedDay: '2024-09-23' }});
        };
        for (let i = 0; i < 300; i++) {
            interviews.push({ response: { _assignedDay: '2024-09-20' }});
        };
        for (let i = 0; i < 200; i++) {
            interviews.push({ response: { _assignedDay: '2024-09-19' }});
        };
        for (let i = 0; i < 200; i++) {
            interviews.push({ response: { _assignedDay: '2024-09-18' }});
        };
        getInterviewStreamMock.mockReturnValue(new ObjectReadableMock(interviews) as any);

        randomMock.mockReturnValue(3);

        // Use a holiday as previous day
        const interview = _cloneDeep(baseInterview);
        interview.response._previousDay = '2022-10-10';
        expect(await updateCallback(interview, interview.response._previousDay)).toEqual({ '_assignedDay': '2022-10-07', '_originalAssignedDay': '2022-10-07' });
       
        expect(randomMock).toHaveBeenCalledTimes(1);
        const randomParams = randomMock.mock.calls[0];
        // Monday, sunday and saturday should have 0 probability
        expect(randomParams[0][0]).toEqual(0);
        expect(randomParams[0][1]).toEqual(0);
        expect(randomParams[0][2]).toEqual(0);
        // 3 days ago should have higher probability
        expect(randomParams[0][3]).toBeGreaterThan(randomParams[0][0]);
        expect(randomParams[0][3]).toBeGreaterThan(randomParams[0][1]);
        expect(randomParams[0][3]).toBeGreaterThan(randomParams[0][2]);
        expect(randomParams[2]).toEqual((randomParams[0] as number[]).reduce((sum, current) => sum + current, 0));
    });

});