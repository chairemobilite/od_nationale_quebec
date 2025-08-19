import moment from 'moment-business-days';
import { _isBlank, _booleish } from 'chaire-lib-common/lib/utils/LodashExtensions';
import { validateAccessCode } from 'evolution-backend/lib/services/accessCode';
import { getPath, getResponse } from 'evolution-common/lib/utils/helpers';
import * as odSurveyHelpers from 'evolution-common/lib/services/odSurvey/helpers';
import { getPreFilledResponseByPath } from 'evolution-backend/lib/services/interviews/serverFieldUpdate';
import { randomFromDistribution } from 'chaire-lib-common/lib/utils/RandomUtils';
import interviewsDbQueries from 'evolution-backend/lib/models/interviews.db.queries';
import participantsDbQueries from 'evolution-backend/lib/models/participants.db.queries';
import { eightDigitsAccessCodeFormatter } from 'evolution-common/lib/utils/formatters';
import { InterviewAttributes } from 'evolution-common/lib/services/questionnaire/types';
import { postalCodeValidation } from 'evolution-common/lib/services/widgets/validations/validations';
import config from 'chaire-lib-common/lib/config/shared/project.config';
import { getTransitSummary } from 'evolution-backend/lib/services/routing';

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

// Use the postal code validation to validate the postal code
// FIXME We can't use the postal code validation from the widget directly here because it's in a .tsx file and the `checkValidation` function from which this functionw as copy-pasted also is in the evolution-frontend package, so we can't use it in the backend.
const validatePostalCode = (postalCode: string, interview: InterviewAttributes): boolean => {
    const validationsGroup = postalCodeValidation(postalCode, undefined, interview, 'home.postalCode');
    for (let i = 0; i < validationsGroup.length; i++) {
        if (validationsGroup[i].validation === true) {
            return false;
        }
    }
    return true;
};
// Get the postal code from the participant username. If the username does not have a "accessCode-postalCode" pattern, it will return undefined.
const getPostalCodeFromParticipant = async (interview: InterviewAttributes): Promise<string | undefined> => {
    const participant = await participantsDbQueries.getById(interview.participant_id);
    if (!participant) {
        return undefined;
    }
    // The postal code is the last part of the username, after the second '-'
    const postalCode = participant.username.split('-', 3).slice(-1)[0];
    if (_isBlank(postalCode)) {
        return undefined;
    }
    // The login form already checked the format and the validity of the postal
    // code, so if it's valid, we can return it. If it's invalid, it's a
    // participant username that does not contain a postal code and that
    // happened to use a similar pattern, we return undefined so it falls in the
    // default case. This is really custom to this specific survey where byField
    // is the only auth method and some interviews may be started by
    // interviewers. Not to be copied lightly to other surveys.
    if (!_isBlank(postalCode) && validatePostalCode(postalCode, interview)) {
        return postalCode;
    }
    return undefined;
};

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
        callback: async (interview: InterviewAttributes, value) => {
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
                const prefilledResponsesForAccessCode = await getPrefilledForAccessCode(
                    properlyFormattedAccessCode,
                    interview
                );

                // Do not prefill answers if the postal code is not the same as the one used in this survey
                const postalCode = await getPostalCodeFromParticipant(interview);
                const prefilledResponses =
                    postalCode !== undefined &&
                    prefilledResponsesForAccessCode['home.postalCode'] &&
                    prefilledResponsesForAccessCode['home.postalCode'] !== postalCode
                        ? {
                            _postalCodeMismatch: true,
                            _userPostalCode: postalCode,
                            _prefilledPostalCode: prefilledResponsesForAccessCode['home.postalCode']
                        }
                        : prefilledResponsesForAccessCode;

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
    },
    {
        field: '_interviewFinished',
        callback: async (interview, value) => {
            try {
                if (value !== true) {
                    // Ignore all values but true
                    return {};
                }
                // Set the interview as completed if it is set for the first time
                const isInterviewCompleted = getResponse(interview, '_isCompleted', false);
                if (!isInterviewCompleted) {
                    return {
                        _isCompleted: true,
                        _completedAt: Math.ceil(Date.now() / 1000) // Set the completedAt timestamp to now
                    };
                }
                return {};
            } catch (error) {
                console.error('error attempting to set the interview as completed', error);
                return {};
            }
        }
    },
    {
        field: { regex: 'household.persons.*.journeys.*.trips.*.segments.*.modePre' },
        runOnValidatedData: true,
        callback: async (interview, value, path, registerUpdateOperation) => {
            const resultPath = getPath(path, '../trRoutingResult');
            const defaultResponse = { [resultPath]: undefined };
            // If using a public transit mode, retrieve results from trRouting
            if (!['transit'].includes(value) || config.trRoutingScenarios === undefined) {
                return defaultResponse;
            }
            try {
                // Extract IDs from the path
                const pathParts = path.split('.');
                const personId = pathParts[2];
                const journeyId = pathParts[4];
                const tripId = pathParts[6];

                const person = odSurveyHelpers.getPerson({ interview, personId });
                const journey = person ? odSurveyHelpers.getJourneys({ person })[journeyId] : undefined;
                const visitedPlaces = journey ? odSurveyHelpers.getVisitedPlaces({ journey }) : null;
                const trip = journey ? odSurveyHelpers.getTrips({ journey })[tripId] || null : null;
                const householdTripsDate = getResponse(interview, assignedDayPath);
                if (visitedPlaces === null || person === null || trip === null || householdTripsDate === null) {
                    return defaultResponse;
                }

                // Find the scenario for the appropriate week day
                const weekDay = moment(householdTripsDate).day();
                const scenario =
                    weekDay === 0
                        ? config.trRoutingScenarios.DI
                        : weekDay === 6
                            ? config.trRoutingScenarios.SA
                            : config.trRoutingScenarios.SE;
                if (scenario === undefined) {
                    return defaultResponse;
                }

                // Get geography of places
                const origin = odSurveyHelpers.getOrigin({ trip, visitedPlaces });
                const destination = odSurveyHelpers.getDestination({ trip, visitedPlaces });
                const originGeography = origin
                    ? odSurveyHelpers.getVisitedPlaceGeography({
                        visitedPlace: origin,
                        person,
                        interview
                    })
                    : null;
                const destinationGeography = destination
                    ? odSurveyHelpers.getVisitedPlaceGeography({
                        visitedPlace: destination,
                        person,
                        interview
                    })
                    : null;
                const timeOfTrip = origin?.departureTime;

                if (originGeography === null || destinationGeography === null || typeof timeOfTrip !== 'number') {
                    return defaultResponse;
                }

                const executeTransitSummaryPromise = async () => {
                    try {
                        const summaryResponse = await getTransitSummary({
                            origin: originGeography,
                            destination: destinationGeography,
                            transitScenario: scenario,
                            departureSecondsSinceMidnight: timeOfTrip,
                            departureDateString: householdTripsDate,
                            minWaitingTime: 180,
                            maxAccessTravelTime: 20 * 60,
                            maxEgressTravelTime: 20 * 60,
                            maxTransferTravelTime: 20 * 60,
                            maxTravelTime: 180 * 60,
                            maxFirstWaitingTime: 20 * 60
                        } as any);
                        if (summaryResponse.status !== 'success') {
                            console.log('Error getting summary: ', JSON.stringify(summaryResponse));
                        }
                        return { [resultPath]: summaryResponse.status === 'success' ? summaryResponse : undefined };
                    } catch (error) {
                        console.error('Error getting transit summary:', error);
                        return { [resultPath]: undefined };
                    }
                };

                if (typeof registerUpdateOperation !== 'function') {
                    // If registerUpdateOperation is not provided, execute the promise directly, that would be in the validation interface, they can wait
                    return await executeTransitSummaryPromise();
                } else {
                    // Execute the operation in the backend so the result may be ready when needed, but without blocking the call
                    registerUpdateOperation({
                        opName: `transitSummary${originGeography.geometry.coordinates[0]}${originGeography.geometry.coordinates[1]}${destinationGeography.geometry.coordinates[0]}${destinationGeography.geometry.coordinates[1]}`,
                        opUniqueId: 1,
                        operation: async (_isCancelled: () => boolean) => {
                            return await executeTransitSummaryPromise();
                        }
                    });
                    return {};
                }
            } catch (error) {
                console.log('Error occurred while getting summary for transit mode:', error);
                return defaultResponse;
            }
        }
    }
];
