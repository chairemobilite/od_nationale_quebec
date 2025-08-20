import _get from 'lodash/get';
import { _booleish, _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import { Journey, Person, WidgetConditional } from 'evolution-common/lib/services/questionnaire/types';
import * as surveyHelper from 'evolution-common/lib/utils/helpers';
import * as odSurveyHelper from 'evolution-common/lib/services/odSurvey/helpers';
import { loopActivities } from 'evolution-common/lib/services/odSurvey/types';
import { getShortcutVisitedPlaces } from './customFrontendHelper';
import { shouldAskForNoSchoolTripReason, shouldAskForNoWorkTripReason, shouldDisplayTripJunction } from './helper';
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
    const person = surveyHelper.getResponse(interview, path, null, '../') as Person;
    const age: any = surveyHelper.getResponse(interview, path, null, '../age');
    const schoolType: any = surveyHelper.getResponse(interview, path, null, '../schoolType');
    const isStudent: boolean = person.studentType === 'fullTime' || person.studentType === 'partTime';
    const isWorker: boolean = person.workerType === 'fullTime' || person.workerType === 'partTime';

    if (_isBlank(age) || _isBlank(person.workerType) || _isBlank(person.studentType)) {
        return [false, null];
    } else if (isStudent && isWorker) {
        return [false, 'workerAndStudent'];
    } else if (isStudent && person.studentType === 'fullTime') {
        return [false, 'fullTimeStudent'];
    } else if (isStudent && person.studentType === 'partTime') {
        return [false, 'partTimeStudent'];
    } else if (isWorker && person.workerType === 'fullTime') {
        return [false, 'fullTimeWorker'];
    } else if (isWorker && person.workerType === 'partTime') {
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
    const personDidTripsConfirm = (journey as any).personDidTripsConfirm;
    const firstVisitedPlace = odSurveyHelper.getVisitedPlacesArray({
        journey
    })[0];
    const departurePlaceOther = (journey as any).departurePlaceOther;
    if (firstVisitedPlace && firstVisitedPlace.activity && firstVisitedPlace.activity !== 'home') {
        // FIXME should we make sure the departurePlaceOther is one of he possible choices? We have something similar in the `onSectionEntry` of the tripsIntro section... maybe we don't need this here
        return [false, departurePlaceOther];
    }
    return [
        (_booleish(personDidTrips) || _booleish(personDidTripsConfirm)) &&
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

export const shouldAskForNoWorkTripReasonCustomConditional: WidgetConditional = (interview, path) => {
    const person = odSurveyHelper.getPerson({ interview, path });
    return [shouldAskForNoWorkTripReason({ interview, person }), null];
};

export const shouldAskPersonNoWorkTripSpecifyCustomConditional: WidgetConditional = (interview, path) => {
    const reason = surveyHelper.getResponse(interview, path, null, '../noWorkTripReason');
    return [reason === 'other', null];
};

export const shouldAskForNoSchoolTripReasonCustomConditional: WidgetConditional = (interview, path) => {
    const person = odSurveyHelper.getPerson({ interview, path });
    return [shouldAskForNoSchoolTripReason({ interview, person }), null];
};

export const shouldAskForNoSchoolTripSpecifyCustomConditional: WidgetConditional = (interview, path) => {
    const reason = surveyHelper.getResponse(interview, path, null, '../noSchoolTripReason');
    return [reason === 'other', null];
};

export const accessCodeIsSetCustomConditional: WidgetConditional = (interview, path) => {
    // Do not show the access code if it is set and confirmed, but keep its value, to avoid the participant changing its value
    const accessCodeConfirmed = surveyHelper.getResponse(interview, '_accessCodeConfirmed', false);
    const accessCode = surveyHelper.getResponse(interview, path, null);
    return [!accessCodeConfirmed, accessCode];
};

// FIXME This conditional is used instead of the non custom
// `hasHouseholdSize2OrMoreConditional` because the person count can change in
// the household section without changing the household size. When
// https://github.com/chairemobilite/evolution/issues/1132 is fixed and this
// survey correctly updated, this custom conditional won't be necessary
export const hasPersonCount2OrMoreCustomConditional: WidgetConditional = (interview, path) => {
    const personCount = odSurveyHelper.countPersons({ interview });
    return [personCount >= 2, null];
};

export const displayGenderIfSexAtBirthPreferNotAnswerCustomConditional: WidgetConditional = (interview, path) => {
    const person = odSurveyHelper.getPerson({ interview, path });
    const sexAssignedAtBirth = person ? (person as any).sexAssignedAtBirth : null;
    // Display if sexAssignedAtBirth is set to 'preferNotToAnswer', otherwise, set to sexAssignedAtBirth so we have a value for gendered labels
    // FIXME Technically it is not correct to assume sexAssignedAtBirth is the same as gender for labels, it may not be the case, but for modelling purposes, the sexAssignedAtBirth should be used, but Evolution uses gender for personnalized labels
    return [sexAssignedAtBirth === 'preferNotToAnswer', sexAssignedAtBirth];
};
