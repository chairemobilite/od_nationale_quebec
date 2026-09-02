import config from 'chaire-lib-common/lib/config/shared/project.config';
import { getActualPreviousDay } from '../serverHelpers';

describe('getActualPreviousDay', () => {
    const defaultTimezone = config.timezone;

    beforeEach(() => {
        config.timezone = 'America/Montreal';
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
        config.timezone = defaultTimezone;
    });

    test.each([
        ['2026-09-02T02:00:00-04:00', '2026-08-31'],
        ['2026-09-02T05:00:00-04:00', '2026-09-01'],
        // 8am in America/Montreal
        ['2026-09-02T03:00:00-09:00', '2026-09-01'],
        // 8pm, september 1st in America/Montreal
        ['2026-09-02T05:00:00+07:00', '2026-08-31'],
        // 1am in America/Montreal
        ['2026-09-02T05:00:00Z', '2026-08-31']
    ])('uses the trip diary rollover for server time %s: %s', (currentServerTime, expectedPreviousDay) => {
        jest.setSystemTime(new Date(currentServerTime));

        expect(getActualPreviousDay()).toEqual(expectedPreviousDay);
    });

    test.each([
        ['Asia/Tokyo', '2026-09-02T23:00:00Z', '2026-09-02'], // 8am in tokyo time
        ['America/Vancouver', '2026-09-02T10:00:00Z', '2026-08-31'] // 3AM in vancouver time
    ])('uses the configured %s timezone when determining the previous day', (timezone, currentServerTime, expectedPreviousDay) => {
        config.timezone = timezone;
        jest.setSystemTime(new Date(currentServerTime));

        expect(getActualPreviousDay()).toEqual(expectedPreviousDay);
    });
});
