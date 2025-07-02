import { _booleish, _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import { WidgetConditional } from 'evolution-common/lib/services/questionnaire/types';
import * as surveyHelperNew from 'evolution-common/lib/utils/helpers';
import * as odSurveyHelper from 'evolution-common/lib/services/odSurvey/helpers';

const isSchoolEnrolledTrueValues = [
    'kindergarten',
    'childcare',
    'primarySchool',
    'secondarySchool',
    'schoolAtHome',
    'other'
];

// Don't show Question and give 'Québec' as default value
export const hiddenWithQuebecAsDefaultValueCustomConditional: WidgetConditional = (_interview) => {
    return [false, 'Québec'];
};

// Don't show Question and give 'Canada' as default value
export const hiddenWithCanadaAsDefaultValueCustomConditional: WidgetConditional = (_interview) => {
    return [false, 'Canada'];
};

// Stay hidden and put some default value if the person is a student or a worker
export const personOccupationCustomConditional: WidgetConditional = (interview, path) => {
    const person: any = surveyHelperNew.getResponse(interview, path, null, '../');
    const age: any = surveyHelperNew.getResponse(interview, path, null, '../age');
    const workerType: any = surveyHelperNew.getResponse(interview, path, null, '../workerType');
    const schoolType: any = surveyHelperNew.getResponse(interview, path, null, '../schoolType');
    const studentType: any = surveyHelperNew.getResponse(interview, path, null, '../studentType');
    const isStudent: any = person.studentType === 'yesFullTime' || person.studentType === 'yesPartTime';
    const isWorker: any = person.workerType === 'yesFullTime' || person.workerType === 'yesPartTime';

    if (_isBlank(age) || _isBlank(workerType) || _isBlank(studentType)) {
        return [false, null];
    } else if (isStudent && isWorker) {
        return [false, 'workerAndStudent'];
    } else if (isStudent && studentType === 'yesFullTime') {
        return [false, 'fullTimeStudent'];
    } else if (isStudent && studentType === 'yesPartTime') {
        return [false, 'partTimeStudent'];
    } else if (isWorker && workerType === 'yesFullTime') {
        return [false, 'fullTimeWorker'];
    } else if (isWorker && workerType === 'yesPartTime') {
        return [false, 'partTimeWorker'];
    } else if (schoolType && !isSchoolEnrolledTrueValues.includes(schoolType)) {
        return [false, 'other'];
    }
    //condition if not hidden choices
    return [!_isBlank(age) && age >= 14 && !isStudent && !isWorker, null];
};

export const personUsualSchoolPlaceNameCustomConditional: WidgetConditional = (interview, path) => {
    const person: any = surveyHelperNew.getResponse(interview, path, null, '../../');
    const schoolLocationType = person.schoolLocationType;
    const isSchoolEnrolledTrueValues = [
        'kindergarten',
        'childcare',
        'primarySchool',
        'secondarySchool',
        'schoolAtHome',
        'other'
    ];
    const isStudentFromEnrolled = (person) => {
        const schoolType = person.schoolType;
        return !_isBlank(schoolType) && isSchoolEnrolledTrueValues.includes(schoolType);
    };
    const childrenCase = isStudentFromEnrolled(person) && person.schoolType !== 'schoolAtHome';
    return [['onLocation', 'hybrid'].includes(schoolLocationType) || childrenCase, null];
};

export const departurePlaceOtherCustomConditional: WidgetConditional = (interview, path) => {
    const journey = odSurveyHelper.getActiveJourney({ interview });
    if (journey === null) {
        return [false, null];
    }
    const personDidTrips = (journey as any).personDidTrips;
    const personDidTripsChangeConfirm = (journey as any).personDidTripsChangeConfirm;
    const firstVisitedPlace = odSurveyHelper.getVisitedPlacesArray({
        journey
    })[0];
    const departurePlaceOther = (journey as any).departurePlaceOther;
    if (firstVisitedPlace && firstVisitedPlace.activity && firstVisitedPlace.activity !== 'home') {
        // FIXME should we make sure the departurePlaceOther is one of he possible choices? We have something similar in the `onSectionEntry` of the tripsIntro section... maybe we don't need this here
        return [false, departurePlaceOther];
    }
    return [
        (_booleish(personDidTrips) || _booleish(personDidTripsChangeConfirm)) &&
            !_isBlank((journey as any).departurePlaceIsHome) &&
            _booleish((journey as any).departurePlaceIsHome) === false,
        null
    ];
};
