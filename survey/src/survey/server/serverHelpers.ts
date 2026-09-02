// Ce fichier contient des fonctions utilisées uniquement dans le backend.

import moment from 'moment-timezone';
import config from 'chaire-lib-common/lib/config/shared/project.config';
import { questionnaireConfiguration } from '../questionnaireConfigBase';

/**
 * Calculate actual previous day from now, in the project's configured timezone
 * and using the trip diary's max time of day as rollover time instead of
 * midnight.
 *
 * @returns The previous day, in YYYY-MM-DD format
 */
export const getActualPreviousDay = () => {
    const maxTimeOfDay = questionnaireConfiguration.tripDiary!.sections.visitedPlaces!.tripDiaryMaxTimeOfDay;
    const now = moment.tz(new Date(), config.timezone || 'UTC');
    // Get the seconds since midnight of the current time
    const secondsSinceMidnight = now.hours() * 60 * 60 + now.minutes() * 60 + now.seconds() + now.milliseconds() / 1000;
    // Get the rollover time, which is the modulo of a full day of the max time of day (would be 0 if max time of day is midnight)
    const rolloverTimeOfDay = maxTimeOfDay % (24 * 60 * 60);
    // If current seconds since midnight is below rollover time, the trip diary
    // current day is not finished, so we go back 2 days.
    const daysToSubtract = secondsSinceMidnight < rolloverTimeOfDay ? 2 : 1;

    return now.subtract(daysToSubtract, 'days').format('YYYY-MM-DD');
};
