import moment from 'moment-business-days';
import { _isBlank, _booleish } from 'chaire-lib-common/lib/utils/LodashExtensions';
import { validateAccessCode } from 'evolution-backend/lib/services/accessCode';
import { getResponse } from 'evolution-common/lib/utils/helpers';
import { getPreFilledResponseByPath } from 'evolution-backend/lib/services/interviews/serverFieldUpdate';
import { randomFromDistribution } from 'chaire-lib-common/lib/utils/RandomUtils';
import interviewsDbQueries from 'evolution-backend/lib/models/interviews.db.queries';
import { eightDigitsAccessCodeFormatter } from 'evolution-common/lib/utils/formatters';

// *** Code for the home address prefill **
const HOME_ADDRESS_KEY = 'home.address';
const HOME_ADDRESS_IS_PREFILLED_KEY = 'home._addressIsPrefilled';
const getPrefilledForAccessCode = async (accessCode, interview) => {
    const prefilledResponses = await getPreFilledResponseByPath(accessCode, interview);
    if (prefilledResponses[HOME_ADDRESS_KEY] !== undefined) {
        prefilledResponses[HOME_ADDRESS_IS_PREFILLED_KEY] = true;
    }
    return prefilledResponses;
};

// *** Code for the assigned day ***
const assignedDayPath = '_assignedDay';
const originalAssignedDayPath = '_originalAssignedDay';
const ASSIGNED_DAY_UPDATE_FREQ_MINUTES = 15;
let lastCheckMoment = undefined;
const assignedDays = [0, 0, 0, 0, 0, 0, 0];
const assignedDayTarget = [0.2, 0.2, 0.2, 0.2, 0.2, 0, 0];
const defaultProbabilityOfDaysBefore = [0.6, 0.2, 0.13, 0.07];
const getAssignedDayRates = (): number[] | undefined => {
    const total = assignedDays.reduce((sum, current) => sum + current, 0);
    // Do not play with days below 500 surveys
    if (total < 500) {
        return undefined;
    }
    return assignedDays.map((dayCount) => dayCount / total);
};

// Exported so it can be called in unit tests
export const updateAssignedDayRates = async () => {
    console.log('Updating assigned day rates...');
    // Filter completed interviews only and interviews that are not invalid (value can be null or true, so we need to use 'not' false)
    const filters = {
        'response._isCompleted': { value: true },
        is_valid: { value: false, op: 'not' as const }
    };
    if (lastCheckMoment !== undefined) {
        filters['response._completedAt'] = { value: Math.ceil(lastCheckMoment.valueOf() / 1000), op: 'gte' };
    }
    const currentCheck = moment();
    lastCheckMoment = currentCheck;
    let interviewCount = 0;
    const queryStream = interviewsDbQueries.getInterviewsStream({
        filters,
        select: { responseType: 'correctedIfAvailable', includeAudits: false }
    });
    return new Promise<void>((resolve, reject) => {
        queryStream
            .on('error', (error) => {
                console.error('queryStream failed', error);
                reject(error);
            })
            .on('data', (row) => {
                const interview = row;
                interviewCount++;

                const assignedDate = getResponse(interview, assignedDayPath);
                if (assignedDate !== undefined) {
                    const momentDay = moment(assignedDate);
                    if (momentDay.isHoliday() && momentDay.isoWeekday() < 6) {
                        // Holiday in a weekday, ignore from count
                        return;
                    }
                    assignedDays[momentDay.isoWeekday() - 1]++;
                }
            })
            .on('end', () => {
                console.log('Updated assigned day rates with the data from %d interviews', interviewCount);
                resolve();
            });
    });
};

const periodicAssignedDatRatesUpdate = async () => {
    await updateAssignedDayRates();
    setTimeout(periodicAssignedDatRatesUpdate, ASSIGNED_DAY_UPDATE_FREQ_MINUTES * 60 * 1000); // Update every X minutes
};

// To avoid the first query when the server restarts to be long when there's a lot of data, make it run asynchronously now.
try {
    console.log('Calculating assigned day rates for the first time');
    periodicAssignedDatRatesUpdate().then(() => {
        console.log('Assigned day rates at start:', assignedDays.toString());
    });
} catch (error) {
    console.error('Error at first calculation of assigned day rates: ', error);
}

export default [
    {
        field: '_previousDay',
        callback: async (interview, value) => {
            const assignedDay = getResponse(interview, assignedDayPath);
            if (!_isBlank(assignedDay)) {
                // already assigned
                return {};
            }
            try {
                const prevDay = moment(value);
                const dow = prevDay.isoWeekday() - 1;
                const currentDayRates = getAssignedDayRates();
                if (currentDayRates === undefined && assignedDayTarget[dow] !== 0) {
                    return { [assignedDayPath]: value, [originalAssignedDayPath]: value };
                }
                const probabilities = [];
                // Divide target by current rate and put to the power of 3, then multiply by default probability.
                // FIXME Fine-tune if necessary
                for (let i = 0; i < 4; i++) {
                    const dow = !prevDay.isHoliday() ? prevDay.isoWeekday() - 1 : 6;
                    probabilities.push(
                        assignedDayTarget[dow] === 0
                            ? 0
                            : Math.max(
                                0.01,
                                Math.pow(
                                    assignedDayTarget[dow] /
                                          Math.max(0.005, currentDayRates === undefined ? 1 : currentDayRates[dow]),
                                    3
                                )
                            ) *
                                  defaultProbabilityOfDaysBefore[i] *
                                  100
                    );
                    prevDay.subtract(1, 'days');
                }

                const totalProbability = probabilities.reduce((total, prob) => total + prob, 0);
                const daysBeforePrevDay = randomFromDistribution(probabilities, undefined, totalProbability);
                const formattedAssignedDay = (
                    daysBeforePrevDay > 0 ? moment(value).subtract(daysBeforePrevDay, 'days') : moment(value)
                ).format('YYYY-MM-DD');
                return {
                    [assignedDayPath]: formattedAssignedDay,
                    [originalAssignedDayPath]: formattedAssignedDay
                };
            } catch (error) {
                console.error('Error getting the assigned day for survey', error);
                // Error, fallback to previous business day
                return { [assignedDayPath]: value, [originalAssignedDayPath]: value };
            }
        }
    },
    {
        field: 'accessCode',
        callback: async (interview, value) => {
            try {
                const properlyFormattedAccessCode =
                    typeof value === 'string' ? eightDigitsAccessCodeFormatter(value) : value;
                // Only valid access codes should be processed
                if (_isBlank(value) || !validateAccessCode(properlyFormattedAccessCode)) {
                    return {};
                }
                // To avoid multiple changes to the access code, we check if it has already been confirmed, if so, simply return.
                const accessCodeConfirmed = getResponse(interview, '_accessCodeConfirmed', false);
                if (accessCodeConfirmed) {
                    return {};
                }

                // Get prefilled responses for this access code
                const prefilledResponses = await getPrefilledForAccessCode(properlyFormattedAccessCode, interview);
                if (properlyFormattedAccessCode !== value) {
                    prefilledResponses['accessCode'] = properlyFormattedAccessCode;
                }
                // Set the access code as confirmed
                prefilledResponses['_accessCodeConfirmed'] = true;
                return prefilledResponses;
            } catch (error) {
                console.error('error getting server update fields for accessCode', error);
                return {};
            }
        }
    }
];
