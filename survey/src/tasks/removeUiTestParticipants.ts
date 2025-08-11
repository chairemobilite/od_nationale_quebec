/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import knex from 'chaire-lib-backend/lib/config/shared/db.config';
import taskWrapper from 'chaire-lib-backend/lib/tasks/taskWrapper';

class RemoveUiTestParticipants {
    async run(argv: { [key: string]: unknown }): Promise<void> {
        try {
            // All username starting with '7357-' are UI test participants, ie correspond to access codes used in the UI tests
            const removedCount = await knex('sv_participants').del().whereILike('username', '7357-%');
            console.log(`Removed ${removedCount} UI test participants from sv_participants table`);
        } catch (error) {
            console.error('Error deleting UI test participants from sv_participants table', error);
        }
    }
}

taskWrapper(new RemoveUiTestParticipants())
    .then(() => {
        console.log('done removing UI test data from DB');
        // eslint-disable-next-line n/no-process-exit
        process.exit(0);
    })
    .catch((err) => {
        console.error('Error executing task removeUiTestParticipants', err);
        // eslint-disable-next-line n/no-process-exit
        process.exit(1);
    });
