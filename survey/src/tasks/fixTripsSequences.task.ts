/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import taskWrapper from 'chaire-lib-backend/lib/tasks/taskWrapper';
import interviewsDbQueries from 'evolution-backend/lib/models/interviews.db.queries';
import * as odHelpers from 'evolution-common/lib/services/odSurvey/helpers';
import { InterviewAttributes } from 'evolution-common/lib/services/questionnaire/types';
import { updateInterview, copyResponseToCorrectedResponse } from 'evolution-backend/lib/services/interviews/interview';
import { getParadataLoggingFunction } from 'evolution-backend/lib/services/logging/paradataLogging';
import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';

const confirmString = 'UPDATE TRIPS SEQUENCES';
/**
 * A bug in Evolution (https://github.com/chairemobilite/evolution/issues/1206)
 * caused all trips to have sequence of 1 when they were created. This task
 * fixes the sequence numbers of the trips for the interviews that were
 * concerned.
 *
 * By default, this task will not update anything, it will just show what will
 * be done, to effectively update the interviews, run with `--confirm "UPDATE
 * TRIPS SEQUENCES"`
 */
class FixTripsSequences {
    private confirm: boolean;

    private async updateInterviewIfRequired(interview, valuesByPath): Promise<void> {
        if (valuesByPath && Object.keys(valuesByPath).length > 0) {
            console.log(
                `Updating trip sequences for interview ${interview.id}`,
                !_isBlank(interview.corrected_response) ? ' (has corrected response)' : ''
            );
            if (this.confirm) {
                await updateInterview(interview, {
                    logUpdate: getParadataLoggingFunction({ interviewId: interview.id, userId: 1 }),
                    valuesByPath,
                    fieldsToUpdate: ['response']
                });
                // If there is corrected response, copy the new updated response
                // to corrected response, no validation has been done so far
                if (!_isBlank(interview.corrected_response)) {
                    await copyResponseToCorrectedResponse(interview);
                }
            }
        }
    }

    async run(argv: { [key: string]: unknown }): Promise<void> {
        try {
            const argvConfirm = argv.confirm as string;
            this.confirm = argvConfirm === confirmString;

            // Paginated approach
            const pageSize = 50;
            let pageIndex = 0;
            let hasMoreInterviews = true;

            while (hasMoreInterviews) {
                // Get a page of interviews, as using stream does not seem to work well when updating the queried table at the same time
                const interviewsPage = await interviewsDbQueries.getList({
                    pageIndex,
                    pageSize,
                    filters: {}
                });

                // Check if we've reached the end
                if (!interviewsPage.interviews || interviewsPage.interviews.length === 0) {
                    hasMoreInterviews = false;
                    continue;
                }

                console.log(`Processing page ${pageIndex + 1} with ${interviewsPage.interviews.length} interviews`);

                // Process each interview in this page
                for (const listInterview of interviewsPage.interviews) {
                    const interview = (await interviewsDbQueries.getInterviewByUuid(
                        listInterview.uuid
                    )) as InterviewAttributes;
                    // For each person's journey
                    const persons = odHelpers.getPersonsArray({ interview: interview });
                    const valuesByPath = {};
                    for (const person of persons) {
                        const journeys = odHelpers.getJourneysArray({ person });
                        if (journeys.length < 1) {
                            continue;
                        }
                        const journey = journeys[0];
                        // For each trip, set the sequence number to the right value and verify the assumption that they are in the right order
                        let lastOriginIndex = -1;
                        // The trips should have identical sequence, but be in order
                        const trips = odHelpers.getTripsArray({ journey });
                        const visitedPlaces = odHelpers.getVisitedPlacesArray({ journey });
                        for (let tripIndex = 0; tripIndex < trips.length; tripIndex++) {
                            const trip = trips[tripIndex];
                            if (trip._sequence !== tripIndex + 1) {
                                // Sequence is not correct, update it
                                valuesByPath[
                                    `response.household.persons.${person._uuid}.journeys.${journey._uuid}.trips.${trip._uuid}._sequence`
                                ] = tripIndex + 1;
                                // Find the index of the origin visited place in the array
                                const originIndex = visitedPlaces.findIndex(
                                    (vp) => vp._uuid === trip._originVisitedPlaceUuid
                                );
                                if (originIndex >= 0) {
                                    if (originIndex <= lastOriginIndex) {
                                        console.warn(
                                            'Origin index is not after last origin index. Trips may be in wrong order for interview',
                                            interview.id
                                        );
                                    }
                                    lastOriginIndex = originIndex;
                                }
                            }
                        }
                    }

                    try {
                        await this.updateInterviewIfRequired(interview, valuesByPath);
                    } catch (error) {
                        console.error('Error updating interview', error);
                    }
                }

                // Move to next page
                pageIndex++;
            }

            if (!this.confirm) {
                console.log(
                    'No interviews were updated, to update the interviews, run again with --confirm "UPDATE TRIPS SEQUENCES"'
                );
            } else {
                console.log('All interviews processed and updated if required.');
            }
        } catch (error) {
            console.error('Error fixing trips sequences', error);
        }
    }
}

taskWrapper(new FixTripsSequences())
    .then(() => {
        console.log('Done fixing trips sequences');
        // eslint-disable-next-line n/no-process-exit
        process.exit(0);
    })
    .catch((err) => {
        console.error('Error executing task fixTripsSequences', err);
        // eslint-disable-next-line n/no-process-exit
        process.exit(1);
    });
