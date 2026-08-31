import { faCheckCircle } from '@fortawesome/free-solid-svg-icons';
import moment from 'moment-business-days';
import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import config from 'evolution-common/lib/config/project.config';
import { Journey, Person, Segment, UserInterviewAttributes } from 'evolution-common/lib/services/questionnaire/types';
import { getResponse } from 'evolution-common/lib/utils/helpers';
import * as odSurveyHelper from 'evolution-common/lib/services/odSurvey/helpers';
import { WidgetFactoryOptions } from 'evolution-common/lib/services/questionnaire/sections/types';
import {
    getFormattedDate,
    validateButtonAction,
    validateButtonActionWithCompleteSection
} from 'evolution-frontend/lib/services/display/frontendHelper';
import { Mode } from 'evolution-common/lib/services/odSurvey/types';

// FIXME Move elsewhere as we start using Evolution's builtin sections. It is
// here to be available for widgets.ts, sections.ts and questionnaire.ts files.
// Consider moving those defaults to evolution-frontend, all those functions
// come from evolution-frontend or evolution-common anyway and it's copy-pasted
// from other surveys.
export const widgetFactoryOptions: WidgetFactoryOptions = {
    getFormattedDate: getFormattedDate,
    buttonActions: {
        validateButtonActionWithCompleteSection: validateButtonActionWithCompleteSection,
        validateButtonAction: validateButtonAction
    },
    iconMapper: { 'check-circle': faCheckCircle }
};

/**
 * Return whether the home section should be considered as completed
 *
 * TODO Parameterize the fields and conditions to check for the section in
 * Evolution instead of requiring this function
 *
 * @param interview
 * @returns
 */
export const homeSectionComplete = (interview: UserInterviewAttributes): boolean => {
    const household = odSurveyHelper.getHousehold({ interview });
    const homeGeometry = getResponse(interview, 'home.geography.geometry.coordinates');
    return !(
        _isBlank(household) ||
        _isBlank(household.size) ||
        _isBlank(household.carNumber) ||
        _isBlank(homeGeometry)
    );
};

/**
 * Return whether the household members section should be considered as
 * completed
 *
 * TODO Parameterize the fields and conditions to check for the section in
 * Evolution instead of requiring this function
 * @param interview
 * @returns
 */
export const householdMembersSectionComplete = (interview: UserInterviewAttributes): boolean => {
    if (!homeSectionComplete(interview)) {
        return false;
    }
    const household = odSurveyHelper.getHousehold({ interview });
    const personCount = odSurveyHelper.countPersons({ interview });
    // FIXME If household size is less than person count, that's ok, we have
    // manually decremented, the participant should have gone to fix it in the
    // household section, if he did not and went directly to the trips (because
    // he already entered data further in the interview), we keep it as is. The
    // check used to be with !== but that prevent from completing the household
    // section when a member was manually added. Return to !==  when
    // https://github.com/chairemobilite/evolution/issues/1132 is fixed
    if (household.size > personCount) {
        return false;
    }
    const persons = odSurveyHelper.getPersonsArray({ interview });
    return persons.every((person) => basicInfoForPersonComplete(person, household.size));
};

// TODO Parameterize the fields and conditions to check for the section in
// Evolution instead of requiring this function
const basicInfoForPersonComplete = function (person: Person, householdSize) {
    return !(
        _isBlank(person) ||
        _isBlank(person.age) ||
        (_isBlank(person.sexAssignedAtBirth) && _isBlank(person.gender) && person.age >= 5) ||
        (householdSize > 1 && _isBlank(person.nickname)) ||
        (_isBlank(person.drivingLicenseOwnership) && person.age >= config.ages.drivingLicenseAge)
    );
};

/**
 * TODO Parameterize the fields and conditions to check for the section in
 * Evolution instead of requiring this function
 * @param person
 * @param interview
 * @returns
 */
export const tripsIntroForPersonComplete = (person, interview: UserInterviewAttributes) => {
    if (person && typeof person.age === 'number' && person.age < 5) {
        return true;
    }
    const journeys = odSurveyHelper.getJourneysArray({ person });
    if (journeys.length === 0) {
        return false;
    }
    const firstJourney = journeys[0];
    return (
        !_isBlank((firstJourney as any).personDidTrips) &&
        ((firstJourney as any).personDidTrips === 'no' || !_isBlank((firstJourney as any).departurePlaceIsHome))
    );
};

export const tripsForPersonComplete = function ({
    person,
    interview
}: {
    person: Person;
    interview: UserInterviewAttributes;
}) {
    const journey = odSurveyHelper.getJourneysArray({ person })[0];
    // Complete if the person did not do any trips
    if (!_isBlank((journey as any).personDidTrips) && (journey as any).personDidTrips !== 'yes') {
        return true;
    }
    // Complete if there is no next trip or visited place to edit
    const nextPlace = odSurveyHelper.getFirstIncompleteVisitedPlace({ interview, journey, person });
    const nextTrip = odSurveyHelper.selectNextIncompleteTrip({ journey });
    return nextTrip === null && nextPlace === null;
};

const getVisitedPlacesForCategory = (journey: Journey, activityCategory: string) => {
    const visitedPlaces = odSurveyHelper.getVisitedPlacesArray({ journey });
    return visitedPlaces.filter((visitedPlace) => visitedPlace.activityCategory === activityCategory);
};

export const shouldAskForNoWorkTripReason = ({
    person,
    interview
}: {
    person: Person;
    interview: UserInterviewAttributes;
}) => {
    // Ask only for all workers with fixed location
    const journey = odSurveyHelper.getJourneysArray({ person })[0];
    if (!person || !journey) {
        return false;
    }
    const workerType = person.workerType;
    const workPlaceType = person.workPlaceType;
    const workPlaceTypeIsCompatible =
        ['onLocation', 'onTheRoadWithUsualPlace', 'onTheRoadWithoutUsualPlace', 'hybrid'].includes(workPlaceType) &&
        ['fullTime', 'partTime'].includes(workerType);
    if (!workPlaceTypeIsCompatible) {
        return false;
    }

    const tripsDate = getResponse(interview, '_assignedDay', null);
    const tripsDateIsBusinessDay = moment(tripsDate).isBusinessDay();
    return tripsDateIsBusinessDay && getVisitedPlacesForCategory(journey, 'work').length === 0;
};

export const shouldAskForNoSchoolTripReason = ({
    person,
    interview
}: {
    person: Person;
    interview: UserInterviewAttributes;
}) => {
    // Ask only for full time students
    const journey = odSurveyHelper.getJourneysArray({ person })[0];
    if (!person || !journey) {
        return false;
    }
    const studentType = person.studentType;
    const schoolPlaceType = person.schoolPlaceType;
    const schoolPlaceIsCompatible =
        ['onLocation', 'hybrid'].includes(schoolPlaceType) && ['fullTime', 'partTime'].includes(studentType);
    const childrenCase = odSurveyHelper.isStudentFromSchoolType({ person });
    if (!(schoolPlaceIsCompatible || childrenCase)) {
        return false;
    }

    const tripsDate = getResponse(interview, '_assignedDay', null);
    const tripsDateIsBusinessDay = moment(tripsDate).isBusinessDay();

    return tripsDateIsBusinessDay && getVisitedPlacesForCategory(journey, 'school').length === 0;
};

const travelBehaviorForPersonComplete = function ({
    person,
    interview
}: {
    person: Person;
    interview: UserInterviewAttributes;
}) {
    // If the person is a child, we consider the travel behavior section as complete
    if (person && typeof person.age === 'number' && person.age < 5) {
        return true;
    }
    // If the person is not a student or worker, we consider the travel behavior section as complete
    if (person && !isStudent(person) && !isWorker(person)) {
        return true;
    }
    // Make sure the no trip reasons are answered if required
    const shouldAskNoSchoolTrip = shouldAskForNoSchoolTripReason({ person, interview });
    const shouldAskNoWorkTrip = shouldAskForNoWorkTripReason({ person, interview });
    if (!shouldAskNoSchoolTrip && !shouldAskNoWorkTrip) {
        return true;
    }
    const journey = odSurveyHelper.getJourneysArray({ person })[0] as any;
    return (
        (!shouldAskNoSchoolTrip || typeof journey.noSchoolTripReason === 'string') &&
        (!shouldAskNoWorkTrip || typeof journey.noWorkTripReason === 'string')
    );
};

/**
 * TODO Parameterize the fields and conditions to check for the section in
 * Evolution instead of requiring this function
 * @param person
 * @param interview
 * @returns Whether the trip diary and travel behavior is finished
 */
export const tripDiaryAndTravelBehaviorForPersonComplete = function (person, interview: UserInterviewAttributes) {
    // FIXME Add conditions as sections are added
    return (
        tripsIntroForPersonComplete(person, interview) &&
        tripsForPersonComplete({ person, interview }) &&
        travelBehaviorForPersonComplete({ person, interview })
    );
};

/**
 * TODO Parameterize the fields and conditions to check for the section in
 * Evolution instead of requiring this function
 * @param interview
 * @returns
 */
export const allPersonsTripDiariesCompleted = function (interview: UserInterviewAttributes) {
    const interviewablePersons = odSurveyHelper.getInterviewablePersonsArray({ interview });
    return interviewablePersons.every((person) => tripDiaryAndTravelBehaviorForPersonComplete(person, interview));
};

/**
 * Whether the person is a student
 * TODO Parameterize the fields and conditions to check for the section in
 * Evolution instead of requiring this function
 * @param person
 * @returns
 */
export const isStudent = (person: Person) => {
    if (_isBlank(person)) {
        return false;
    }
    return ['fullTimeStudent', 'partTimeStudent', 'workerAndStudent'].includes(person.occupation);
};

/**
 * Whether the person is a worker
 * @param person
 * @returns
 */
export const isWorker = (person: Person) => {
    if (_isBlank(person)) {
        return false;
    }
    return ['fullTimeWorker', 'partTimeWorker', 'workerAndStudent'].includes(person.occupation);
};

const publicModesForJunctions = [
    'transitBus',
    'transitRRT',
    'transitLRRT',
    'transitRegionalRail',
    'transitStreetCar',
    'transitTaxi',
    'transitFerry',
    'train',
    'intercityBus'
];
// Walking is excluded from private modes
const privateModesForJunctions = [
    'taxi',
    'ferryWithCar',
    'motorcycle',
    'bicycle',
    'bicycleElectric',
    'kickScooterElectric',
    'plane',
    'other',
    'wheelchair',
    'carDriver',
    'carDriverRental',
    'carDriverCarsharing',
    'motorcycle',
    'carPassenger',
    'paratransit'
];

/**
 * Display if previous mode is private mode and current is public, or vice versa
 */
export const shouldDisplayTripJunction = (previous: Segment | Mode, current: Segment | Mode) => {
    const previousMode = typeof previous === 'string' ? previous : previous.mode;
    const currentMode = typeof current === 'string' ? current : current.mode;
    // tripJunction needed when changing from private to public modes (private modes: car driver, car passenger, moto, taxi - walking is excluded )
    if (
        (privateModesForJunctions.includes(previousMode) && publicModesForJunctions.includes(currentMode)) ||
        (publicModesForJunctions.includes(previousMode) && privateModesForJunctions.includes(currentMode))
    ) {
        return true;
    }
    return false;
};
