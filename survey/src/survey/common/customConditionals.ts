import moment from 'moment-business-days';
import _get from 'lodash/get';
import { _booleish, _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import { Journey, Person, WidgetConditional } from 'evolution-common/lib/services/questionnaire/types';
import * as surveyHelper from 'evolution-common/lib/utils/helpers';
import * as odSurveyHelper from 'evolution-common/lib/services/odSurvey/helpers';
import { loopActivities } from 'evolution-common/lib/services/odSurvey/types';
import { getShortcutVisitedPlaces } from './customFrontendHelper';
import { shouldDisplayTripJunction } from './helper';
import { isStudentFromEnrolled } from './customHelpers';

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
    const person: any = surveyHelper.getResponse(interview, path, null, '../');
    const age: any = surveyHelper.getResponse(interview, path, null, '../age');
    const workerType: any = surveyHelper.getResponse(interview, path, null, '../workerType');
    const schoolType: any = surveyHelper.getResponse(interview, path, null, '../schoolType');
    const studentType: any = surveyHelper.getResponse(interview, path, null, '../studentType');
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
    const person = surveyHelper.getResponse(interview, path, null, '../../') as Person;
    const schoolPlaceType = person.schoolPlaceType;

    const childrenCase = isStudentFromEnrolled(person) && person.schoolType !== 'schoolAtHome';
    return [['onLocation', 'hybrid'].includes(schoolPlaceType) || childrenCase, null];
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

export const currentPlaceWorkOnTheRoadAndNoNextPlaceCustomConditional: WidgetConditional = (interview, path) => {
    const person = odSurveyHelper.getPerson({ interview });
    const journey = odSurveyHelper.getActiveJourney({ interview, person });
    const visitedPlace: any = surveyHelper.getResponse(interview, path, null, '../');
    const visitedPlaceActivity = visitedPlace.activity;
    const nextVisitedPlace = odSurveyHelper.getNextVisitedPlace({ journey, visitedPlaceId: visitedPlace._uuid });
    return [!nextVisitedPlace && visitedPlaceActivity === 'workOnTheRoad', null];
};

export const isLastPlaceCustomConditional: WidgetConditional = (interview, path) => {
    const person = odSurveyHelper.getPerson({ interview });
    const journey = odSurveyHelper.getActiveJourney({ interview, person });
    const visitedPlace: any = odSurveyHelper.getActiveVisitedPlace({ interview, journey });
    const visitedPlacesArray = odSurveyHelper.getVisitedPlacesArray({ journey });
    return (
        visitedPlacesArray.length > 1 && visitedPlacesArray[visitedPlacesArray.length - 1]._uuid === visitedPlace._uuid
    );
};

export const alreadyVisitedPlaceCustomConditional: WidgetConditional = (interview, path) => {
    const activity: any = surveyHelper.getResponse(interview, path, null, '../activity');
    // Do not display if no activity
    if (_isBlank(activity)) {
        return [false, null];
    }
    // Do not display if it is an incompatible activity
    const incompatibleActivity = [...loopActivities, 'home'].includes(activity);
    if (incompatibleActivity) {
        return [false, null];
    }

    // Do not display if usual place is already set
    const person = odSurveyHelper.getPerson({ interview });
    if (
        (activity === 'workUsual' && (person as any).usualWorkPlace && (person as any).usualWorkPlace.geography) ||
        (activity === 'schoolUsual' && (person as any).usualSchoolPlace && (person as any).usualSchoolPlace.geography)
    ) {
        return [false, null];
    }

    // Display if there are possible shortcuts
    const geography: any = surveyHelper.getResponse(interview, path, null, '../geography');
    let lastAction = null;
    if (geography) {
        lastAction = _get(geography, 'properties.lastAction', null);
    }
    const shortcuts = getShortcutVisitedPlaces(interview);
    return [(lastAction === null || lastAction === 'shortcut') && shortcuts.length > 0, null];
};

export const isCarDriverAndDestinationWorkCustomConditional: WidgetConditional = (interview, path) => {
    const segment: any = surveyHelper.getResponse(interview, path, null, '../');
    const modePre = segment ? segment.modePre : null;

    const person = odSurveyHelper.getPerson({ interview });
    const trip = odSurveyHelper.getActiveTrip({ interview });
    const journey = odSurveyHelper.getActiveJourney({ interview, person });
    const visitedPlaces = odSurveyHelper.getVisitedPlaces({ journey });
    const destination = odSurveyHelper.getDestination({ visitedPlaces, trip });

    return [modePre === 'carDriver' && destination.activityCategory === 'work', null];
};

const peopleCountQuestionModes = ['carDriver', 'rentalCar', 'carDriverCarsharing'];
export const isSelfDeclaredCarDriverCustomConditional: WidgetConditional = (interview, path) => {
    const segment: any = surveyHelper.getResponse(interview, path, null, '../');
    // Display for respondent car drivers (exlude motorcycle)
    if (segment.modePre !== 'carDriver') {
        return [false, null];
    }
    const person = odSurveyHelper.getActivePerson({ interview });
    return [
        odSurveyHelper.isSelfDeclared({ interview, person }) && peopleCountQuestionModes.includes(segment.mode),
        null
    ];
};

export const isTransitAndNotNationaleCustomConditional: WidgetConditional = (interview, path) => {
    const mode = surveyHelper.getResponse(interview, path, null, '../mode');
    return [(mode === 'transitTaxi' || mode === 'transitBus') && process.env.EV_VARIANT !== 'nationale', null];
};

export const shouldAskTripJunctionCustomConditional: WidgetConditional = (interview, path) => {
    const person = odSurveyHelper.getPerson({ interview });
    const trip = odSurveyHelper.getActiveTrip({ interview });
    if (trip) {
        const journey = odSurveyHelper.getActiveJourney({ interview, person });
        const visitedPlaces = odSurveyHelper.getVisitedPlaces({ journey });
        const destination = odSurveyHelper.getDestination({ visitedPlaces, trip });
        const activity = destination ? destination.activity : null;
        const segments = odSurveyHelper.getSegmentsArray({ trip });
        const currentSegment: any = surveyHelper.getResponse(interview, path, undefined, '../');
        const segmentIndex = segments.findIndex((segment) => segment._sequence === currentSegment?._sequence);
        if (segmentIndex === undefined || segmentIndex === 0) {
            return [false, null];
        }
        const previousSegment = segments[segmentIndex - 1];
        return [shouldDisplayTripJunction(previousSegment, currentSegment, activity), null];
    }
    return [false, null];
};

const getVisitedPlacesForCategory = (journey: Journey, activityCategory: string) => {
    const visitedPlaces = odSurveyHelper.getVisitedPlacesArray({ journey });
    return visitedPlaces.filter((visitedPlace) => visitedPlace.activityCategory === activityCategory);
};

export const shouldAskForNoWorkTripReasonCustomConditional: WidgetConditional = (interview, path) => {
    // Ask only for full time workers
    const person = odSurveyHelper.getPerson({ interview, path });
    const journey = odSurveyHelper.getJourneysArray({ person })[0];
    if (!person || !journey) {
        return [false, null];
    }
    const workerType = person.workerType;
    const workPlaceType = person.workPlaceType;
    const workPlaceTypeIsCompatible =
        ['onLocation', 'onTheRoadWithUsualPlace', 'onTheRoadWithoutUsualPlace'].includes(workPlaceType) &&
        workerType === 'fullTime';
    if (!workPlaceTypeIsCompatible) {
        return [false, null];
    }

    const tripsDate = surveyHelper.getResponse(interview, '_assignedDay', null);
    const tripsDateIsBusinessDay = moment(tripsDate).isBusinessDay();
    return [tripsDateIsBusinessDay && getVisitedPlacesForCategory(journey, 'work').length === 0, null];
};

export const shouldAskPersonNoWorkTripSpecifyCustomConditional: WidgetConditional = (interview, path) => {
    const reason = surveyHelper.getResponse(interview, path, null, '../noWorkTripReason');
    return [reason === 'other', null];
};

export const shouldAskForNoSchoolTripReasonCustomConditional: WidgetConditional = (interview, path) => {
    // Ask only for full time students
    const person = odSurveyHelper.getPerson({ interview, path });
    const journey = odSurveyHelper.getJourneysArray({ person })[0];
    if (!person || !journey) {
        return [false, null];
    }
    const studentType = person.studentType;
    const schoolPlaceType = person.schoolPlaceType;
    const schoolPlaceIsCompatible = schoolPlaceType === 'onLocation' && studentType === 'fullTime';
    const childrenCase = isStudentFromEnrolled(person);
    if (!(schoolPlaceIsCompatible || childrenCase)) {
        return [false, null];
    }

    const tripsDate = surveyHelper.getResponse(interview, '_assignedDay', null);
    const tripsDateIsBusinessDay = moment(tripsDate).isBusinessDay();

    return [tripsDateIsBusinessDay && getVisitedPlacesForCategory(journey, 'school').length === 0, null];
};

export const shouldAskForNoSchoolTripSpecifyCustomConditional: WidgetConditional = (interview, path) => {
    const reason = surveyHelper.getResponse(interview, path, null, '../noSchoolTripReason');
    return [reason === 'other', null];
};
