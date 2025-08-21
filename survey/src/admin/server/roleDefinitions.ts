import { addRoleHomePage } from 'chaire-lib-backend/lib/services/auth/userPermissions';
import setupInterviewerRoleDefinition from 'evolution-interviewer/lib/server/services/auth/roleDefinition';

// Add the interviewer roles definition and set the admin's page to /admin
export default () => {
    setupInterviewerRoleDefinition();

    addRoleHomePage('admin', '/admin');
};
