/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { getVisitedPlaceDescription, VisitedPlaceDescriptionOptions } from '../customFrontendHelper';
import { Person, VisitedPlace } from 'evolution-common/lib/services/questionnaire/types';

// Mock i18next
jest.mock('i18next', () => ({
    t: jest.fn((key: string) => {
        const translations = {
            'survey:visitedPlace:activities:home': 'Home',
            'survey:visitedPlace:activities:work': 'Work',
            'survey:visitedPlace:activities:shopping': 'Shopping',
            'survey:visitedPlace:activities:school': 'School',
            'survey:visitedPlace:activities:leisure': 'Leisure'
        };
        return translations[key] || key;
    })
}));

// Mock secondsSinceMidnightToTimeStr
jest.mock('chaire-lib-common/lib/utils/DateTimeUtils', () => ({
    secondsSinceMidnightToTimeStr: jest.fn((seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    })
}));

describe('getVisitedPlaceDescription', () => {
    const mockPerson: Person = {
        _uuid: 'person1',
        nickname: 'John',
        _sequence: 1
    } as Person;

    const mockVisitedPlace: VisitedPlace = {
        _uuid: 'place1',
        activity: 'shopping',
        name: 'Walmart',
        _sequence: 1,
        alreadyVisitedBySelfOrAnotherHouseholdMember: false
    } as VisitedPlace;

    describe('Basic functionality', () => {
        test('should return complete description with all parts', () => {
            const visitedPlace: VisitedPlace = {
                ...mockVisitedPlace,
                arrivalTime: 32400, // 09:00
                departureTime: 36000 // 10:00
            };

            const result = getVisitedPlaceDescription(visitedPlace, mockPerson, { withTimes: true, withActivity: true, withNickname: true, allowHtml: true });
            expect(result).toBe('<em>Walmart</em> • John • Shopping (09:00 -> 10:00)');
        });

        test('should return description without HTML when allowHtml is false', () => {
            const result = getVisitedPlaceDescription(mockVisitedPlace, mockPerson, { withTimes: false, withActivity: true, withNickname: true, allowHtml: false });
            expect(result).toBe('Walmart • John • Shopping');
        });
    });

    describe('Nickname handling', () => {
        test('should include nickname when withNickname is true', () => {
            const result = getVisitedPlaceDescription(mockVisitedPlace, mockPerson, { withTimes: false, withActivity: true, withNickname: true, allowHtml: true });
            expect(result).toBe('<em>Walmart</em> • John • Shopping');
        });

        test('should exclude nickname when withNickname is false', () => {
            const result = getVisitedPlaceDescription(mockVisitedPlace, mockPerson, { withTimes: false, withActivity: true, withNickname: false, allowHtml: true });
            expect(result).toBe('<em>Walmart</em> • Shopping');
        });

        test('should handle missing person', () => {
            const result = getVisitedPlaceDescription(mockVisitedPlace, undefined, { withTimes: false, withActivity: true, withNickname: true, allowHtml: true });
            expect(result).toBe('<em>Walmart</em> • Shopping');
        });

        test('should handle person without nickname', () => {
            const personWithoutNickname = { ...mockPerson, nickname: undefined };
            const result = getVisitedPlaceDescription(mockVisitedPlace, personWithoutNickname, { withTimes: false, withActivity: true, withNickname: true, allowHtml: true });
            expect(result).toBe('<em>Walmart</em> • Shopping');
        });
    });

    describe('Place name handling', () => {
        test('should include place name when available', () => {
            const result = getVisitedPlaceDescription(mockVisitedPlace, mockPerson, { withTimes: false, withActivity: true, withNickname: true, allowHtml: true });
            expect(result).toBe('<em>Walmart</em> • John • Shopping');
        });

        test('should handle missing place name', () => {
            const visitedPlaceWithoutName: VisitedPlace = {
                ...mockVisitedPlace,
                name: undefined,
                alreadyVisitedBySelfOrAnotherHouseholdMember: true
            } as VisitedPlace;
            const result = getVisitedPlaceDescription(visitedPlaceWithoutName, mockPerson, { withTimes: false, withActivity: true, withNickname: true, allowHtml: true });
            expect(result).toBe('John • Shopping');
        });

        test('should handle empty place name', () => {
            const visitedPlaceWithEmptyName: VisitedPlace = {
                ...mockVisitedPlace,
                name: '',
                alreadyVisitedBySelfOrAnotherHouseholdMember: false
            } as VisitedPlace;
            const result = getVisitedPlaceDescription(visitedPlaceWithEmptyName, mockPerson, { withTimes: false, withActivity: true, withNickname: true, allowHtml: true });
            expect(result).toBe('John • Shopping');
        });
    });

    describe('Activity handling', () => {
        test('should include activity when withActivity is true', () => {
            const result = getVisitedPlaceDescription(mockVisitedPlace, mockPerson, { withTimes: false, withActivity: true, withNickname: true, allowHtml: true });
            expect(result).toBe('<em>Walmart</em> • John • Shopping');
        });

        test('should exclude activity when withActivity is false and place name exists', () => {
            const result = getVisitedPlaceDescription(mockVisitedPlace, mockPerson, { withTimes: false, withActivity: false, withNickname: true, allowHtml: true });
            expect(result).toBe('<em>Walmart</em> • John');
        });

        test('should exclude activity when withActivity is false and place name exists and times are available', () => {
            const visitedPlaceWithTimes: VisitedPlace = {
                ...mockVisitedPlace,
                arrivalTime: 32400, // 09:00
                departureTime: 36000 // 10:00
            };
            const result = getVisitedPlaceDescription(visitedPlaceWithTimes, mockPerson, { withTimes: true, withActivity: false, withNickname: true, allowHtml: true });
            expect(result).toBe('<em>Walmart</em> • John (09:00 -> 10:00)');
        });

        test('should always show activity when place name is missing, even if withActivity is false', () => {
            const visitedPlaceWithoutName: VisitedPlace = {
                ...mockVisitedPlace,
                name: undefined,
                alreadyVisitedBySelfOrAnotherHouseholdMember: true
            } as VisitedPlace;
            const result = getVisitedPlaceDescription(visitedPlaceWithoutName, mockPerson, { withTimes: false, withActivity: false, withNickname: true, allowHtml: true });
            expect(result).toBe('John • Shopping');
        });

        test('should handle different activity types', () => {
            const homePlace: VisitedPlace = {
                ...mockVisitedPlace,
                activity: 'home',
                name: 'My House',
                alreadyVisitedBySelfOrAnotherHouseholdMember: false
            } as VisitedPlace;
            const result = getVisitedPlaceDescription(homePlace, mockPerson, { withTimes: false, withActivity: true, withNickname: true, allowHtml: true });
            expect(result).toBe('<em>My House</em> • John • Home');
        });
    });

    describe('Time handling', () => {
        test('should include times when withTimes is true and times are available', () => {
            const visitedPlaceWithTimes: VisitedPlace = {
                ...mockVisitedPlace,
                arrivalTime: 32400, // 09:00
                departureTime: 36000 // 10:00
            };
            const result = getVisitedPlaceDescription(visitedPlaceWithTimes, mockPerson, { withTimes: true, withActivity: true, withNickname: true, allowHtml: true });
            expect(result).toBe('<em>Walmart</em> • John • Shopping (09:00 -> 10:00)');
        });

        test('should exclude times when withTimes is false', () => {
            const visitedPlaceWithTimes: VisitedPlace = {
                ...mockVisitedPlace,
                arrivalTime: 32400,
                departureTime: 36000
            };
            const result = getVisitedPlaceDescription(visitedPlaceWithTimes, mockPerson, { withTimes: false, withActivity: true, withNickname: true, allowHtml: true });
            expect(result).toBe('<em>Walmart</em> • John • Shopping');
        });

        test('should handle arrival time only', () => {
            const visitedPlaceWithArrival: VisitedPlace = {
                ...mockVisitedPlace,
                arrivalTime: 32400, // 09:00
                departureTime: undefined
            };
            const result = getVisitedPlaceDescription(visitedPlaceWithArrival, mockPerson, { withTimes: true, withActivity: true, withNickname: true, allowHtml: true });
            expect(result).toBe('<em>Walmart</em> • John • Shopping (09:00 ->)');
        });

        test('should handle departure time only', () => {
            const visitedPlaceWithDeparture: VisitedPlace = {
                ...mockVisitedPlace,
                arrivalTime: undefined,
                departureTime: 36000 // 10:00
            };
            const result = getVisitedPlaceDescription(visitedPlaceWithDeparture, mockPerson, { withTimes: true, withActivity: true, withNickname: true, allowHtml: true });
            expect(result).toBe('<em>Walmart</em> • John • Shopping (-> 10:00)');
        });

        test('should exclude times when both arrival and departure are undefined', () => {
            const visitedPlaceWithoutTimes: VisitedPlace = {
                ...mockVisitedPlace,
                arrivalTime: undefined,
                departureTime: undefined
            };
            const result = getVisitedPlaceDescription(visitedPlaceWithoutTimes, mockPerson, { withTimes: true, withActivity: true, withNickname: true, allowHtml: true });
            expect(result).toBe('<em>Walmart</em> • John • Shopping');
        });
    });

    describe('Separator logic', () => {
        test('should use bullet separators between all content parts', () => {
            const result = getVisitedPlaceDescription(mockVisitedPlace, mockPerson, { withTimes: false, withActivity: true, withNickname: true, allowHtml: true });
            expect(result).toContain(' • ');
        });

        test('should use bullet separators between content parts', () => {
            const visitedPlaceWithTimes: VisitedPlace = {
                ...mockVisitedPlace,
                arrivalTime: 32400,
                departureTime: 36000
            };
            const result = getVisitedPlaceDescription(visitedPlaceWithTimes, mockPerson, { withTimes: true, withActivity: true, withNickname: true, allowHtml: true });
            expect(result).toBe('<em>Walmart</em> • John • Shopping (09:00 -> 10:00)');
        });

        test('should not have double separators when parts are missing', () => {
            const visitedPlaceWithoutName: VisitedPlace = {
                ...mockVisitedPlace,
                name: undefined,
                alreadyVisitedBySelfOrAnotherHouseholdMember: true
            } as VisitedPlace;
            const result = getVisitedPlaceDescription(visitedPlaceWithoutName, mockPerson, { withTimes: false, withActivity: true, withNickname: true, allowHtml: true });
            expect(result).toBe('John • Shopping');
            expect(result).not.toContain('• •');
        });

        test('should not have trailing separators', () => {
            const result = getVisitedPlaceDescription(mockVisitedPlace, mockPerson, { withTimes: false, withActivity: true, withNickname: true, allowHtml: true });
            expect(result).not.toMatch(/\s+$/);
            expect(result).not.toMatch(/•\s*$/);
        });
    });

    describe('Edge cases', () => {
        test('should handle minimal data (only activity)', () => {
            const minimalPlace: VisitedPlace = {
                _uuid: 'place1',
                activity: 'home',
                _sequence: 1
            } as VisitedPlace;
            const result = getVisitedPlaceDescription(minimalPlace, undefined, { withTimes: false, withActivity: true, withNickname: false, allowHtml: true });
            expect(result).toBe('Home');
        });

        test('should handle all flags disabled except required ones', () => {
            const visitedPlaceWithoutName: VisitedPlace = {
                ...mockVisitedPlace,
                name: undefined,
                alreadyVisitedBySelfOrAnotherHouseholdMember: true
            } as VisitedPlace;
            const result = getVisitedPlaceDescription(visitedPlaceWithoutName, mockPerson, { withTimes: false, withActivity: false, withNickname: false, allowHtml: false });
            expect(result).toBe('Shopping'); // Activity shown because no place name
        });

        test('should handle empty content gracefully', () => {
            const emptyPlace: VisitedPlace = {
                _uuid: 'place1',
                activity: 'home',
                name: '',
                _sequence: 1
            } as VisitedPlace;
            const result = getVisitedPlaceDescription(emptyPlace, undefined, { withTimes: false, withActivity: false, withNickname: false, allowHtml: true });
            expect(result).toBe('Home'); // Activity shown because no place name
        });
    });
});
