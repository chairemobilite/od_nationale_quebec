import _get from 'lodash/get';
import _truncate from 'lodash/truncate';
import _max from 'lodash/max';
import _min from 'lodash/min';
import _cloneDeep from 'lodash/cloneDeep';
import _escape from 'lodash/escape';
import config from 'evolution-common/lib/config/project.config';
import * as WidgetConfig from 'evolution-common/lib/services/questionnaire/types';
import * as odSurveyHelpers from 'evolution-common/lib/services/odSurvey/helpers';
import * as validations from 'evolution-common/lib/services/widgets/validations/validations';
import { TFunction } from 'i18next';
import {
    addGroupedObjects,
    formatGeocodingQueryStringFromMultipleFields,
    getPath,
    getResponse
} from 'evolution-common/lib/utils/helpers';
import {
    getFormattedDate,
    getVisitedPlaceDescription,
    validateButtonAction
} from 'evolution-frontend/lib/services/display/frontendHelper';
import { getPersonVisitedPlacesMapConfig } from 'evolution-common/lib/services/questionnaire/sections/common/widgetPersonVisitedPlacesMap';
import {
    getActivityIcon,
    getActivityMarkerIcon
} from 'evolution-common/lib/services/questionnaire/sections/visitedPlaces/activityIconMapping';
import {
    isStudent,
    isStudentFromEnrolled,
    carsharingMembersCountInHousehold,
    getShortcutVisitedPlaceName,
    getShortcutVisitedPlacePerson,
    formatTripDuration,
    getHomeAddressOneLine,
    selectNextIncompleteVisitedPlace,
    deleteVisitedPlace
} from '../../common/helper';
import { _booleish, _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import i18n from 'evolution-frontend/lib/config/i18n.config';
import { loopActivities } from 'evolution-common/lib/services/odSurvey/types';
import { faCheckCircle, faTrashAlt } from '@fortawesome/free-solid-svg-icons';
import { getShortcutVisitedPlaces } from '../../common/customFrontendHelper';
import { buttonNextBase, inputTimeBase } from 'evolution-frontend/lib/components/inputs/defaultInputBase';
import { personVisitedPlacesWidgetsNames } from './widgetsNames';
import { getSwitchPersonWidgets } from 'evolution-common/lib/services/questionnaire/sections/common/widgetsSwitchPerson';
import { inaccessibleZoneGeographyCustomValidation } from '../../common/customValidations';

const switchPersonWidgets = getSwitchPersonWidgets();

export const activePersonTitle: WidgetConfig.TextWidgetConfig = switchPersonWidgets.activePersonTitle;

export const buttonSwitchPerson: WidgetConfig.ButtonWidgetConfig = switchPersonWidgets.buttonSwitchPerson;

// FIXME Allow to configure the earliest and latest time
const MIN_SECONDS_SINCE_MIDNIGHT = 4 * 60 * 60; // 4 AM
const MAX_SECONDS_SINCE_MIDNIGHT = 24 * 60 * 60 + MIN_SECONDS_SINCE_MIDNIGHT; // 4 AM the next day

export const personVisitedPlacesTitle = {
    type: 'text',
    path: 'household.persons.{_activePersonId}.personVisitedPlacesTitle',
    align: 'left',
    containsHtml: true,
    text: (t: TFunction, interview) => {
        const person = odSurveyHelpers.getActivePerson({ interview });
        const assignedDay = getResponse(interview, '_assignedDay') as string;
        const assignedDate = getFormattedDate(assignedDay, { withDayOfWeek: true, withRelative: true });

        return t('visitedPlaces:personVisitedPlacesTitle', {
            nickname: _escape(person.nickname),
            context: person?.gender || person?.sexAssignedAtBirth,
            assignedDate,
            count: odSurveyHelpers.getCountOrSelfDeclared({ interview, person })
        });
    }
};

// FIXME: See if the maps takes into account the moving activities which were in 2024, but not yet in evolution
export const personVisitedPlacesMap = getPersonVisitedPlacesMapConfig({ getFormattedDate });

export const personVisitedPlaces: WidgetConfig.GroupConfig = {
    type: 'group',
    path: 'household.persons.{_activePersonId}.journeys.{_activeJourneyId}.visitedPlaces',
    title: {
        fr: 'Lieux visités',
        en: 'Visited places'
    },
    filter: function (interview, groupedObjects) {
        const journey = odSurveyHelpers.getActiveJourney({ interview }); // Ensure the active journey is set
        const activeVisitedPlace = odSurveyHelpers.getActiveVisitedPlace({ interview, journey });
        if (activeVisitedPlace) {
            const filteredGroupedObject = {};
            for (const groupedObjectId in groupedObjects) {
                if (groupedObjectId === activeVisitedPlace._uuid) {
                    filteredGroupedObject[groupedObjectId] = groupedObjects[groupedObjectId];
                }
            }
            return filteredGroupedObject;
        } else {
            return {};
        }
    },
    name: (t: TFunction, groupedObject: unknown, sequence: number) => {
        return `${t('visitedPlaces:VisitedPlaceSequence', { count: sequence })} ${
            (groupedObject as any).name
                ? `• **${(groupedObject as any).name}**`
                : (groupedObject as any).activity
                    ? `• **${t(`survey:visitedPlace:activities:${(groupedObject as any).activity}`)}**`
                    : ''
        }`;
    },
    showGroupedObjectDeleteButton: false,
    deleteConfirmPopup: {
        content: (t: TFunction) => t('visitedPlaces:ConfirmDeleteVisitedPlace')
    },
    showGroupedObjectAddButton: true,
    addButtonLocation: 'both',
    widgets: personVisitedPlacesWidgetsNames
};

export const visitedPlaceActivityCategory: WidgetConfig.InputRadioType = {
    type: 'question',
    path: 'activityCategory',
    inputType: 'radio',
    datatype: 'string',
    columns: 2,
    containsHtml: true,
    useAssignedValueOnHide: true,
    label: (t: TFunction, interview, path) => {
        const person = odSurveyHelpers.getPerson({ interview });
        const journey = odSurveyHelpers.getActiveJourney({ interview, person });
        const activeVisitedPlace = odSurveyHelpers.getActiveVisitedPlace({ interview, journey });
        const visitedPlacesArray = odSurveyHelpers.getVisitedPlacesArray({ journey });
        const firstVisitedPlace = visitedPlacesArray[0];
        const secondVisitedPlace = visitedPlacesArray[1];
        if (firstVisitedPlace && firstVisitedPlace._uuid === activeVisitedPlace._uuid) {
            return t('visitedPlaces:ActivityCategoryFirstLocation');
        } else if (
            firstVisitedPlace &&
            secondVisitedPlace &&
            firstVisitedPlace.activity === 'home' &&
            secondVisitedPlace._uuid === activeVisitedPlace._uuid
        ) {
            return t('visitedPlaces:ActivityCategoryAfterHome');
        } else {
            return t('visitedPlaces:ActivityCategory');
        }
    },
    choices: [
        {
            value: 'home',
            label: (t: TFunction) => t('survey:visitedPlace:activityCategories:home'),
            iconPath: getActivityIcon('home'),
            conditional: function (interview, path) {
                // hide if previous visited place is home:
                const person = odSurveyHelpers.getPerson({ interview });
                const journey = odSurveyHelpers.getActiveJourney({ interview, person });
                const activeVisitedPlace = odSurveyHelpers.getActiveVisitedPlace({ interview, journey });
                const nextVisitedPlace = odSurveyHelpers.getNextVisitedPlace({
                    journey,
                    visitedPlaceId: activeVisitedPlace._uuid
                });
                const previousVisitedPlace = odSurveyHelpers.getPreviousVisitedPlace({
                    journey,
                    visitedPlaceId: activeVisitedPlace._uuid
                });

                return (
                    (!previousVisitedPlace ||
                        (previousVisitedPlace && previousVisitedPlace.activityCategory !== 'home')) &&
                    (!nextVisitedPlace || (nextVisitedPlace && nextVisitedPlace.activityCategory !== 'home'))
                );
            }
        },
        {
            value: 'work',
            label: (t: TFunction) => t('survey:visitedPlace:activityCategories:work'),
            iconPath: getActivityIcon('work'),
            conditional: function (interview, path) {
                // hide if younger than 15:
                const person = odSurveyHelpers.getPerson({ interview });
                return person.age && person.age >= 15;
            }
        },
        {
            value: 'school',
            label: (t: TFunction, interview) => {
                const person = odSurveyHelpers.getPerson({ interview });
                if (person.schoolType && person.schoolType === 'childcare') {
                    return t('survey:visitedPlace:activityCategories:childcare');
                } else if (person.schoolType && person.schoolType === 'kindergarten') {
                    return t('survey:visitedPlace:activityCategories:kindergarten');
                } else if (
                    person.schoolType &&
                    (person.schoolType === 'kindergartenFor4YearsOld' ||
                        person.schoolType === 'primarySchool' ||
                        person.schoolType === 'secondarySchool')
                ) {
                    return t('survey:visitedPlace:activityCategories:school');
                } else {
                    return t('survey:visitedPlace:activityCategories:schoolStudies');
                }
            },
            conditional: function (interview, path) {
                const person = odSurveyHelpers.getPerson({ interview });
                const occupation = person.occupation;
                return (
                    person.age &&
                    person.age >= 5 &&
                    ([
                        'fullTimeWorker',
                        'partTimeWorker',
                        'fullTimeStudent',
                        'partTimeStudent',
                        'workerAndStudent'
                    ].includes(occupation) ||
                        isStudentFromEnrolled(person))
                );
            },
            iconPath: getActivityIcon('school')
        },
        {
            value: 'shoppingServiceRestaurant',
            label: (t: TFunction) => t('survey:visitedPlace:activityCategories:shoppingServiceRestaurant'),
            iconPath: getActivityIcon('shoppingServiceRestaurant')
        },
        {
            value: 'dropFetchSomeone',
            label: (t: TFunction) => t('survey:visitedPlace:activityCategories:dropFetchSomeone'),
            iconPath: getActivityIcon('dropFetchSomeone')
        },
        {
            value: 'leisure',
            label: (t: TFunction) => t('survey:visitedPlace:activityCategories:leisure'),
            iconPath: getActivityIcon('leisure')
        },
        {
            value: 'otherParentHome',
            label: (t: TFunction) => t('survey:visitedPlace:activityCategories:otherParentHome'),
            iconPath: getActivityIcon('otherParentHome'),
            conditional: function (interview, path) {
                // hide if previous visited place is home:
                const person = odSurveyHelpers.getPerson({ interview });
                const journey = odSurveyHelpers.getActiveJourney({ interview, person });
                const activeVisitedPlace = odSurveyHelpers.getActiveVisitedPlace({ interview, journey });
                const nextVisitedPlace = odSurveyHelpers.getNextVisitedPlace({
                    journey,
                    visitedPlaceId: activeVisitedPlace._uuid
                });
                const previousVisitedPlace = odSurveyHelpers.getPreviousVisitedPlace({
                    journey,
                    visitedPlaceId: activeVisitedPlace._uuid
                });

                return (
                    person.age &&
                    person.age <= 16 &&
                    (!previousVisitedPlace || previousVisitedPlace.activityCategory !== 'otherParentHome') &&
                    (!nextVisitedPlace || nextVisitedPlace.activityCategory !== 'otherParentHome')
                );
            }
        },
        {
            value: 'other',
            label: (t: TFunction) => t('survey:visitedPlace:activityCategories:other'),
            iconPath: getActivityIcon('other')
        }
    ],
    validations: function (value) {
        return [
            {
                validation: _isBlank(value),
                errorMessage: (t: TFunction) => t('survey:visitedPlace:activityIsRequiredError')
            }
        ];
    },
    conditional: function (interview, path) {
        const journey = odSurveyHelpers.getActiveJourney({ interview });
        const activeVisitedPlace = odSurveyHelpers.getActiveVisitedPlace({ interview, journey });
        return [
            (activeVisitedPlace as any)._isNew === false || activeVisitedPlace.activityCategory !== 'home',
            activeVisitedPlace.activityCategory
        ];
    }
};

// Validate that the next or previous visited place are not in the incompatible activities list
const validatePreviousNextPlaceIsNotActivities = ({
    interview,
    incompatibleActivities
}: {
    interview: WidgetConfig.UserInterviewAttributes;
    incompatibleActivities: string[];
}) => {
    const journey = odSurveyHelpers.getActiveJourney({ interview });
    const visitedPlace: any = odSurveyHelpers.getActiveVisitedPlace({ interview, journey });
    const previousVisitedPlace = odSurveyHelpers.getPreviousVisitedPlace({
        journey,
        visitedPlaceId: visitedPlace._uuid
    });
    const nextVisitedPlace = odSurveyHelpers.getNextVisitedPlace({
        journey,
        visitedPlaceId: visitedPlace._uuid
    });
    return (
        (!previousVisitedPlace ||
            (previousVisitedPlace && !incompatibleActivities.includes(previousVisitedPlace.activity))) &&
        (!nextVisitedPlace || (nextVisitedPlace && !incompatibleActivities.includes(nextVisitedPlace.activity)))
    );
};

const visitedPlaceActivityChoices = [
    {
        value: 'workUsual',
        label: (t: TFunction) => t('survey:visitedPlace:activities:workUsual'),
        iconPath: getActivityIcon('workUsual'),
        conditional: function (interview, path) {
            const person = odSurveyHelpers.getActivePerson({ interview });
            const occupation = person.occupation;
            const activityCategory = getResponse(interview, path, null, '../activityCategory');

            // FIXME Taken from od_nationale_2024, but seems like this condition and the next should be merged somehow, no?
            if (
                activityCategory === 'work' &&
                (person as any).usualWorkPlace &&
                (person as any).usualWorkPlace.geography
            ) {
                return true;
            }
            return (
                (person as any).usualWorkPlace &&
                ['fullTimeWorker', 'partTimeWorker', 'workerAndStudent'].includes(occupation) &&
                activityCategory === 'work' &&
                validatePreviousNextPlaceIsNotActivities({ interview, incompatibleActivities: ['workUsual'] })
            );
        }
    },
    {
        value: 'workNotUsual',
        label: (t: TFunction) => t('survey:visitedPlace:activities:workNotUsual'),
        conditional: function (interview, path) {
            const activityCategory = getResponse(interview, path, null, '../activityCategory');
            return activityCategory === 'work';
        },
        iconPath: getActivityIcon('workNotUsual')
    },
    {
        value: 'workOnTheRoad',
        label: (t: TFunction) => t('survey:visitedPlace:activities:workOnTheRoad'),
        conditional: function (interview, path) {
            const activityCategory = getResponse(interview, path, null, '../activityCategory');
            return (
                activityCategory === 'work' &&
                validatePreviousNextPlaceIsNotActivities({ interview, incompatibleActivities: loopActivities })
            );
        },
        iconPath: getActivityIcon('workOnTheRoad')
    },
    {
        value: 'schoolUsual',
        label: (t: TFunction) => t('survey:visitedPlace:activities:schoolUsual'),
        conditional: function (interview, path) {
            const person = odSurveyHelpers.getActivePerson({ interview });
            const occupation = person.occupation;

            const activityCategory = getResponse(interview, path, null, '../activityCategory');

            if (
                activityCategory === 'school' &&
                (person.schoolType === 'kindergarten' || person.schoolType === 'childcare')
            ) {
                return true;
            }

            return (
                (person as any).usualSchoolPlace &&
                activityCategory === 'school' &&
                (['fullTimeStudent', 'partTimeStudent', 'workerAndStudent'].includes(occupation) ||
                    (person.age && person.age <= 15)) &&
                validatePreviousNextPlaceIsNotActivities({ interview, incompatibleActivities: ['schoolUsual'] })
            );
        },
        iconPath: getActivityIcon('schoolUsual')
    },
    {
        value: 'schoolNotUsual',
        label: (t: TFunction) => t('survey:visitedPlace:activities:schoolNotUsual'),
        conditional: function (interview, path) {
            const activityCategory = getResponse(interview, path, null, '../activityCategory');
            return activityCategory === 'school';
        },
        iconPath: getActivityIcon('schoolNotUsual')
    },
    {
        value: 'shopping',
        label: (t: TFunction) => t('survey:visitedPlace:activities:shopping'),
        conditional: function (interview, path) {
            const activityCategory = getResponse(interview, path, null, '../activityCategory');
            return activityCategory === 'shoppingServiceRestaurant';
        },
        iconPath: getActivityIcon('shopping')
    },
    {
        value: 'restaurant',
        label: (t: TFunction) => t('survey:visitedPlace:activities:restaurant'),
        conditional: function (interview, path) {
            const activityCategory: any = getResponse(interview, path, null, '../activityCategory');
            return (
                activityCategory === 'shoppingServiceRestaurant' ||
                activityCategory === 'leisure' ||
                activityCategory === 'other'
            );
        },
        iconPath: getActivityIcon('restaurant')
    },
    {
        value: 'service',
        label: (t: TFunction) => t('survey:visitedPlace:activities:service'),
        conditional: function (interview, path) {
            const activityCategory = getResponse(interview, path, null, '../activityCategory');
            return activityCategory === 'shoppingServiceRestaurant' || activityCategory === 'other';
        },
        iconPath: getActivityIcon('service')
    },
    {
        value: 'dropSomeone',
        label: (t: TFunction) => t('survey:visitedPlace:activities:dropSomeone'),
        conditional: function (interview, path) {
            const activityCategory: any = getResponse(interview, path, null, '../activityCategory');
            return activityCategory === 'dropFetchSomeone' || activityCategory === 'other';
        },
        iconPath: getActivityIcon('dropSomeone')
    },
    {
        value: 'fetchSomeone',
        label: (t: TFunction) => t('survey:visitedPlace:activities:fetchSomeone'),
        conditional: function (interview, path) {
            const activityCategory: any = getResponse(interview, path, null, '../activityCategory');
            return activityCategory === 'dropFetchSomeone' || activityCategory === 'other';
        },
        iconPath: getActivityIcon('fetchSomeone')
    },
    {
        value: 'accompanySomeone', // added in PR merged on 2023/09/11, added some days later in the production questionnaire
        label: (t: TFunction) => t('survey:visitedPlace:activities:accompanySomeone'),
        conditional: function (interview, path) {
            const activityCategory: any = getResponse(interview, path, null, '../activityCategory');
            return activityCategory === 'other' || activityCategory === 'dropFetchSomeone';
        },
        iconPath: getActivityIcon('accompanySomeone')
    },
    {
        value: 'leisureStroll',
        label: (t: TFunction) => t('survey:visitedPlace:activities:leisureStroll'),
        conditional: function (interview, path) {
            const activityCategory: any = getResponse(interview, path, null, '../activityCategory');
            return (
                (activityCategory === 'leisure' || activityCategory === 'other') &&
                validatePreviousNextPlaceIsNotActivities({ interview, incompatibleActivities: loopActivities })
            );
        },
        iconPath: getActivityIcon('leisureStroll')
    },
    {
        value: 'leisureSports',
        label: (t: TFunction) => t('survey:visitedPlace:activities:leisureSports'),
        conditional: function (interview, path) {
            const activityCategory = getResponse(interview, path, null, '../activityCategory');
            return activityCategory === 'leisure';
        },
        iconPath: getActivityIcon('leisureSports')
    },
    {
        value: 'leisureArtsMusicCulture',
        label: (t: TFunction) => t('survey:visitedPlace:activities:leisureArtsMusicCulture'),
        conditional: function (interview, path) {
            const activityCategory: any = getResponse(interview, path, null, '../activityCategory');
            return activityCategory === 'leisure';
        },
        iconPath: getActivityIcon('leisureArtsMusicCulture')
    },
    {
        value: 'leisureTourism',
        label: (t: TFunction) => t('survey:visitedPlace:activities:leisureTourism'),
        conditional: function (interview, path) {
            const activityCategory: any = getResponse(interview, path, null, '../activityCategory');
            return activityCategory === 'leisure';
        },
        iconPath: getActivityIcon('leisureTourism')
    },
    {
        value: 'visiting',
        label: (t: TFunction) => t('survey:visitedPlace:activities:visiting'),
        conditional: function (interview, path) {
            const activityCategory: any = getResponse(interview, path, null, '../activityCategory');
            return activityCategory === 'leisure' || activityCategory === 'other';
        },
        iconPath: getActivityIcon('visiting')
    },
    {
        value: 'medical',
        label: (t: TFunction) => t('survey:visitedPlace:activities:medical'),
        conditional: function (interview, path) {
            const activityCategory: any = getResponse(interview, path, null, '../activityCategory');
            return activityCategory === 'shoppingServiceRestaurant' || activityCategory === 'other';
        },
        iconPath: getActivityIcon('medical')
    },
    {
        value: 'veterinarian',
        label: (t: TFunction) => t('survey:visitedPlace:activities:veterinarian'),
        conditional: function (interview, path) {
            const activityCategory: any = getResponse(interview, path, null, '../activityCategory');
            return activityCategory === 'shoppingServiceRestaurant' || activityCategory === 'other';
        },
        iconPath: getActivityIcon('veterinarian')
    },
    {
        value: 'worship',
        label: (t: TFunction) => t('survey:visitedPlace:activities:worship'),
        conditional: function (interview, path) {
            const activityCategory = getResponse(interview, path, null, '../activityCategory');
            return (
                activityCategory === 'other' ||
                activityCategory === 'leisure' ||
                activityCategory === 'shoppingServiceRestaurant'
            );
        },
        iconPath: getActivityIcon('worship')
    },
    {
        value: 'volunteering',
        label: (t: TFunction) => t('survey:visitedPlace:activities:volunteering'),
        conditional: function (interview, path) {
            const activityCategory = getResponse(interview, path, null, '../activityCategory');
            return activityCategory === 'other' || activityCategory === 'work' || activityCategory === 'leisure';
        },
        iconPath: getActivityIcon('volunteering')
    },
    {
        value: 'secondaryHome',
        label: (t: TFunction) => t('survey:visitedPlace:activities:secondaryHome'),
        conditional: function (interview, path) {
            const activityCategory: any = getResponse(interview, path, null, '../activityCategory');
            return activityCategory === 'other' || activityCategory === 'leisure';
        },
        iconPath: getActivityIcon('secondaryHome')
    },
    {
        value: 'schoolNotStudent',
        label: (t: TFunction) => t('survey:visitedPlace:activities:schoolNotStudent'),
        conditional: function (interview, path) {
            const person = odSurveyHelpers.getActivePerson({ interview });
            const activityCategory: any = getResponse(interview, path, null, '../activityCategory');
            return activityCategory === 'other' && !isStudent(person) && person.age && person.age >= 16;
        },
        iconPath: getActivityIcon('schoolNotStudent')
    },
    {
        value: 'carElectricChargingStation',
        label: (t: TFunction) => t('survey:visitedPlace:activities:carElectricChargingStation'),
        conditional: function (interview, path) {
            const person = odSurveyHelpers.getActivePerson({ interview });
            const drivingLicenseOwnership = person ? person.drivingLicenseOwnership : 'dontKnow';
            const activityCategory: any = getResponse(interview, path, null, '../activityCategory');
            return (
                drivingLicenseOwnership === 'yes' &&
                (activityCategory === 'shoppingServiceRestaurant' || activityCategory === 'other')
            );
        },
        iconPath: getActivityIcon('carElectricChargingStation')
    },
    {
        value: 'carsharingStation',
        label: (t: TFunction) => t('survey:visitedPlace:activities:carsharingStation'),
        conditional: function (interview, path) {
            const carsharingMembersCount = carsharingMembersCountInHousehold(interview);
            const activityCategory: any = getResponse(interview, path, null, '../activityCategory');
            return (
                carsharingMembersCount > 0 &&
                (activityCategory === 'shoppingServiceRestaurant' || activityCategory === 'other')
            );
        },
        iconPath: getActivityIcon('carsharingStation')
    },
    {
        value: 'pickClassifiedPurchase',
        label: (t: TFunction) => t('survey:visitedPlace:activities:pickClassifiedPurchase'),
        conditional: function (interview, path) {
            const activityCategory: any = getResponse(interview, path, null, '../activityCategory');
            return activityCategory === 'other' || activityCategory === 'shoppingServiceRestaurant';
        },
        iconPath: getActivityIcon('pickClassifiedPurchase')
    },
    {
        value: 'other',
        label: (t: TFunction) => t('survey:visitedPlace:activities:other'),
        conditional: function (interview, path) {
            const activityCategory: any = getResponse(interview, path, null, '../activityCategory');
            return (
                activityCategory === 'other' ||
                activityCategory === 'shoppingServiceRestaurant' ||
                activityCategory === 'dropFetchSomeone' ||
                activityCategory === 'leisure'
            );
        },
        iconPath: getActivityIcon('other')
    }
];

export const visitedPlaceActivity: WidgetConfig.InputRadioType = {
    type: 'question',
    path: 'activity',
    inputType: 'radio',
    datatype: 'string',
    containsHtml: true,
    columns: 2,
    label: (t: TFunction, interview) => {
        const person = odSurveyHelpers.getActivePerson({ interview });
        const nickname = _escape(person.nickname);
        return t('visitedPlaces:Activity', {
            nickname,
            count: odSurveyHelpers.getCountOrSelfDeclared({ interview, person })
        });
    },
    choices: visitedPlaceActivityChoices,
    validations: function (value, customValue, interview, path, customPath) {
        return [
            {
                validation: _isBlank(value),
                errorMessage: (t: TFunction) => t('survey:visitedPlace:activityIsRequiredError')
            }
        ];
    },
    conditional: function (interview, path) {
        const visitedPlace: any = getResponse(interview, path, null, '../');
        const activityCategory = visitedPlace.activityCategory;

        // Home is the only activity category that does not require sub-choices of activity types
        if (_isBlank(activityCategory) || activityCategory === 'home' || activityCategory === 'otherParentHome') {
            return [false, activityCategory];
        }

        // If there is only one valid activity type, auto-select it and hide this question.
        // TODO: Fix cleanly in evolution. See https://github.com/chairemobilite/evolution/issues/110
        const activityChoices = visitedPlaceActivityChoices.filter((choice) => {
            return choice.conditional(interview, path) === true;
        });
        if (activityChoices.length === 1) {
            return [false, activityChoices[0].value];
        }

        // Otherwise, display the question.
        return [true, null];
    }
};

const visitedPlaceOnTheRoadDepartureTypeChoices = [
    {
        value: 'home',
        label: (t: TFunction, interview, path) => t('survey:visitedPlace:onTheRoadDepartureTypeChoices:home')
    },
    {
        value: 'usualWorkPlace',
        label: (t: TFunction, interview, path) => t('survey:visitedPlace:onTheRoadDepartureTypeChoices:usualWorkPlace'),
        conditional: function (interview, path) {
            const person = odSurveyHelpers.getPerson({ interview });
            return person.workPlaceType === 'onTheRoadWithUsualPlace';
        }
    },
    {
        value: 'other',
        label: (t: TFunction, interview, path) => {
            const journey = odSurveyHelpers.getActiveJourney({ interview });
            const activeVisitedPlace = odSurveyHelpers.getActiveVisitedPlace({ interview, journey });
            const previousVisitedPlace = odSurveyHelpers.getPreviousVisitedPlace({
                journey,
                visitedPlaceId: activeVisitedPlace._uuid
            });
            const previousVisitedPlaceDescription = previousVisitedPlace
                ? getVisitedPlaceDescription(previousVisitedPlace, false, false)
                : undefined;
            return previousVisitedPlaceDescription
                ? previousVisitedPlaceDescription
                : t('survey:visitedPlace:onTheRoadDepartureTypeChoices:other');
        },
        conditional: function (interview, path) {
            const person = odSurveyHelpers.getPerson({ interview });
            const journey = odSurveyHelpers.getActiveJourney({ interview });
            const activeVisitedPlace = odSurveyHelpers.getActiveVisitedPlace({ interview, journey });
            const previousVisitedPlace = odSurveyHelpers.getPreviousVisitedPlace({
                journey,
                visitedPlaceId: activeVisitedPlace._uuid
            });
            return (
                'home' !== previousVisitedPlace.activityCategory &&
                previousVisitedPlace.activity !== 'workOnTheRoad' &&
                !(previousVisitedPlace.activity === 'workUsual' && person.workPlaceType === 'onTheRoadWithUsualPlace')
            );
        }
    }
];

export const visitedPlaceOnTheRoadDepartureType: WidgetConfig.InputRadioType = {
    type: 'question',
    inputType: 'radio',
    path: 'onTheRoadDepartureType',
    datatype: 'string',
    twoColumns: false,
    sameLine: false,
    label: (t: TFunction, interview, path) => {
        const person = odSurveyHelpers.getPerson({ interview });
        const nickname = person.nickname;
        return t('visitedPlaces:onTheRoadDepartureType', {
            nickname,
            count: odSurveyHelpers.getCountOrSelfDeclared({ interview, person })
        });
    },
    choices: visitedPlaceOnTheRoadDepartureTypeChoices,
    validations: validations.requiredValidation,
    conditional: function (interview, path) {
        const sequence = getResponse(interview, path, null, '../_sequence');
        const isNew = getResponse(interview, path, null, '../_isNew');
        const visitedPlaceActivity = getResponse(interview, path, null, '../activity');
        const condition = isNew !== false && sequence !== 1 && visitedPlaceActivity === 'workOnTheRoad';
        if (condition === false) {
            // Exit early
            return [condition, null];
        }

        // If there is only one valid departure location, auto-select it and hide this question.
        // TODO: Fix cleanly in evolution. See https://github.com/chairemobilite/evolution/issues/110
        const choices = visitedPlaceOnTheRoadDepartureTypeChoices.filter((choice) => {
            return !_isBlank(choice.conditional) ? choice.conditional(interview, path) === true : true;
        });
        if (choices.length === 1) {
            return [false, choices[0].value];
        }

        // Otherwise, display the question.
        return [true, null];
    }
};

export const visitedPlaceShortcut: WidgetConfig.InputSelectType = {
    type: 'question',
    path: 'shortcut',
    inputType: 'select',
    datatype: 'string',
    twoColumns: false,
    containsHtml: true,
    label: (t: TFunction, interview) => {
        const person = odSurveyHelpers.getPerson({ interview });
        const nickname = _escape(person.nickname);
        return t('visitedPlaces:shortcut', {
            nickname,
            count: odSurveyHelpers.getCountOrSelfDeclared({ interview, person })
        });
    },
    choices: function (interview, path) {
        // Ne pas afficher si ce n'est pas une activité compatible
        const activity: any = getResponse(interview, path, null, '../activity');
        const usualActivity = ['workUsual', 'schoolUsual'].includes(activity);

        // Si ce n'est pas une activité usuelle, afficher tous les shortcuts possibles
        if (!usualActivity) {
            const shortcuts = getShortcutVisitedPlaces(interview);
            const choices = [];
            for (let i = 0, count = shortcuts.length; i < count; i++) {
                const shortcut = shortcuts[i];
                choices.push({
                    value: shortcut.visitedPlaceId,
                    label: {
                        fr: shortcut.description,
                        en: shortcut.description
                    }
                });
            }
            return choices;
        }

        // Si c'est une activité usuelle, afficher seulement les places du même type. Oui, c'est possible que qqn d'autre l'ait déjà localisé, mais pour ce type de lieu, on veut l'avoir de la personne elle-même
        const person = odSurveyHelpers.getPerson({ interview });
        const currentJourney = odSurveyHelpers.getActiveJourney({ interview, person });
        const visitedPlacesArray = odSurveyHelpers.getVisitedPlacesArray({ journey: currentJourney });
        const currentVisitedPlace = odSurveyHelpers.getActiveVisitedPlace({ interview, journey: currentJourney });
        const previousSameActivities = visitedPlacesArray.filter(
            (visitedPlace) =>
                currentVisitedPlace._uuid !== visitedPlace._uuid &&
                visitedPlace.activity === activity &&
                visitedPlace.shortcut === undefined
        );
        return previousSameActivities.map((prevActivity) => ({
            value: `household.persons.${person._uuid}.journeys.${currentJourney._uuid}.visitedPlaces.${prevActivity._uuid}`,
            label: getVisitedPlaceDescription(prevActivity, false, false)
        }));
    },
    conditional: function (interview, path) {
        const activity: any = getResponse(interview, path, null, '../activity');
        const visitedPlaceAlreadyVisited: any = getResponse(
            interview,
            path,
            null,
            '../alreadyVisitedBySelfOrAnotherHouseholdMember'
        );
        return [!_isBlank(activity) && visitedPlaceAlreadyVisited === 'yes', null];
    }
};

export const visitedPlaceName: WidgetConfig.InputStringType = {
    type: 'question',
    path: 'name',
    inputType: 'string',
    datatype: 'string',
    containsHtml: true,
    label: (t: TFunction, interview, path) => {
        const person = odSurveyHelpers.getPerson({ interview });
        const nickname = _escape(person.nickname);
        let activity = getResponse(interview, path, null, '../activity');

        if (_booleish((person as any).workOnTheRoad) === true && activity === 'workUsual') {
            activity = 'workUsual_onTheRoadOften'; // Special case for this one. See CSV questionnaire
        }
        const key = 'visitedPlaces:LocationNameAddressExample_' + activity;

        const examples = t(key, { context: process.env.EV_VARIANT });
        const helpText =
            i18n.exists(key) && !_isBlank(activity) && !_isBlank(examples)
                ? `<span class="_pale _oblique">(${t('survey:forExampleAbbreviation')}: ${examples})</span>`
                : '';
        return (
            t('visitedPlaces:LocationNameAddress', {
                nickname,
                count: odSurveyHelpers.getCountOrSelfDeclared({ interview, person })
            }) +
            ' ' +
            helpText
        );
    },
    conditional: function (interview, path) {
        const visitedPlace: any = getResponse(interview, path, null, '../');
        const activity = visitedPlace.activity;
        const person = odSurveyHelpers.getActivePerson({ interview });
        if (activity === 'workUsual' && (person as any).usualWorkPlace && (person as any).usualWorkPlace.name) {
            return [false, (person as any).usualWorkPlace.name];
        }
        if (activity === 'schoolUsual' && (person as any).usualSchoolPlace && (person as any).usualSchoolPlace.name) {
            return [false, (person as any).usualSchoolPlace.name];
        }
        const visitedPlaceAlreadyVisited = getResponse(
            interview,
            path,
            null,
            '../alreadyVisitedBySelfOrAnotherHouseholdMember'
        );
        const shouldDisplay =
            !_isBlank(activity) &&
            ![...loopActivities, 'home'].includes(activity) &&
            visitedPlaceAlreadyVisited !== 'yes';
        if (!shouldDisplay) {
            // Try to get the name from the shortcut if any
            if (visitedPlace.shortcut) {
                const shortcut = visitedPlace.shortcut;
                const shortcutVisitedPlace: any = getResponse(interview, shortcut, null);
                const shortcutVisitedPlaceName = shortcutVisitedPlace
                    ? getShortcutVisitedPlaceName(shortcutVisitedPlace, interview)
                    : null;
                return [false, shortcutVisitedPlaceName];
            }
        }
        return [shouldDisplay, null];
    },
    defaultValue: function (interview, path) {
        const visitedPlace: any = getResponse(interview, path, null, '../');
        if (visitedPlace.shortcut) {
            const shortcut = visitedPlace.shortcut;
            const shortcutVisitedPlace = getResponse(interview, shortcut, null);
            const shortcutVisitedPlaceName = getShortcutVisitedPlaceName(shortcutVisitedPlace, interview);
            if (shortcutVisitedPlaceName) {
                return shortcutVisitedPlaceName;
            }
        }
        return undefined;
    },
    validations: function (value, customValue, interview, path, customPath) {
        return [
            {
                validation: _isBlank(value),
                errorMessage: (t: TFunction) => t('survey:visitedPlace:activityDescriptionIsRequiredError')
            }
        ];
    }
};

export const visitedPlaceGeography: WidgetConfig.InputMapFindPlaceType = {
    type: 'question',
    inputType: 'mapFindPlace',
    path: 'geography',
    datatype: 'geojson',
    containsHtml: true,
    height: '32rem',
    refreshGeocodingLabel: (t: TFunction) => t('survey:visitedPlace:refreshGeocodingButton'),
    geocodingQueryString: function (interview, path) {
        return formatGeocodingQueryStringFromMultipleFields([getResponse(interview, path, null, '../name')]);
    },
    maxGeocodingResultsBounds: function (interview, path) {
        // FIXME Add this field to the config
        return (config as any).mapMaxGeocodingResultsBounds;
    },
    invalidGeocodingResultTypes: [
        'political',
        'country',
        'administrative_area_level_1',
        'administrative_area_level_2',
        'administrative_area_level_3',
        'administrative_area_level_4',
        'administrative_area_level_5',
        'administrative_area_level_6',
        'administrative_area_level_7',
        'colloquial_area',
        'locality',
        'sublocality',
        'sublocality_level_1',
        'sublocality_level_2',
        'sublocality_level_3',
        'sublocality_level_4',
        'sublocality_level_5',
        'neighborhood',
        'route'
    ],
    label: (t: TFunction, interview) => t('visitedPlaces:geography'),
    icon: {
        url: function (interview, path) {
            const activity: any = getResponse(interview, path, null, '../activity');
            const activityCategory = getResponse(interview, path, null, '../activityCategory');
            return getActivityMarkerIcon(activity || activityCategory);
        },
        size: [70, 70]
    },
    placesIcon: {
        url: (interview, path) => '/dist/icons/interface/markers/marker_round_with_small_circle.svg',
        size: [35, 35]
    },
    selectedIcon: {
        url: (interview, path) => '/dist/icons/interface/markers/marker_round_with_small_circle_selected.svg',
        size: [35, 35]
    },
    defaultCenter: function (interview, path) {
        const journey = odSurveyHelpers.getActiveJourney({ interview });
        const visitedPlace = odSurveyHelpers.getActiveVisitedPlace({ interview, journey });
        const previousVisitedPlace = visitedPlace
            ? odSurveyHelpers.getPreviousVisitedPlace({ journey, visitedPlaceId: visitedPlace._uuid })
            : undefined;
        if (previousVisitedPlace) {
            const person = odSurveyHelpers.getActivePerson({ interview });
            const geography = odSurveyHelpers.getVisitedPlaceGeography({ visitedPlace, interview, person });
            if (geography) {
                const coordinates = _get(geography, 'geometry.coordinates', null);
                if (coordinates) {
                    return {
                        lat: coordinates[1],
                        lon: coordinates[0]
                    };
                }
            }
        }
        const homeCoordinates: any = getResponse(interview, 'home.geography.geometry.coordinates', null);
        return homeCoordinates
            ? {
                lat: homeCoordinates[1],
                lon: homeCoordinates[0]
            }
            : config.mapDefaultCenter;
    },
    defaultValue: function (interview, path) {
        const person = odSurveyHelpers.getActivePerson({ interview });
        const journey = odSurveyHelpers.getActiveJourney({ interview });
        const visitedPlace = odSurveyHelpers.getActiveVisitedPlace({ interview, journey });
        if (
            visitedPlace.activity === 'workUsual' &&
            (person as any).usualWorkPlace &&
            (person as any).usualWorkPlace.geography
        ) {
            return _cloneDeep((person as any).usualWorkPlace.geography);
        }
        if (
            visitedPlace.activity === 'schoolUsual' &&
            (person as any).usualSchoolPlace &&
            (person as any).usualSchoolPlace.geography
        ) {
            return _cloneDeep((person as any).usualSchoolPlace.geography);
        }
        if (visitedPlace.shortcut) {
            const shortcut = visitedPlace.shortcut;
            const shortcutVisitedPlace: any = getResponse(interview, shortcut, null);
            const geography = shortcutVisitedPlace
                ? odSurveyHelpers.getVisitedPlaceGeography({ visitedPlace: shortcutVisitedPlace, interview, person })
                : null;
            if (shortcutVisitedPlace && !_isBlank(geography)) {
                /* clone the original shortcuted geography,
                   otherwise it will change the lastAction of the
                   previous geography, which is not correct. */
                const clonedGeography = _cloneDeep(geography);
                if (clonedGeography.properties === undefined) {
                    clonedGeography.properties = {};
                }
                clonedGeography.properties.lastAction = 'shortcut';
                return clonedGeography;
            }
        }
        return undefined;
    },
    updateDefaultValueWhenResponded: true,
    validations: function (value, customValue, interview, path, customPath) {
        const activity: any = getResponse(interview, path, null, '../activity');
        const geography: any = getResponse(interview, path, null, '../geography');
        const geocodingTextInput = geography ? geography.properties?.geocodingQueryString : undefined;
        const validations: any[] = [
            {
                validation: ['home', ...loopActivities].indexOf(activity) <= -1 && _isBlank(value),
                errorMessage: (t: TFunction) => t('survey:visitedPlace:locationIsRequiredError')
            },
            {
                validation:
                    geography &&
                    geography.properties.lastAction &&
                    (geography.properties.lastAction === 'mapClicked' ||
                        geography.properties.lastAction === 'markerDragged') &&
                    geography.properties.zoom < 15,
                errorMessage: (t: TFunction) => t('survey:visitedPlace:locationIsNotPreciseError')
            },
            ...inaccessibleZoneGeographyCustomValidation(geography, undefined, interview, path),
            {
                validation: geography && geography.properties.isGeocodingImprecise,
                errorMessage: {
                    fr: `<strong>Le nom du lieu utilisé pour effectuer la recherche ${
                        !_isBlank(geocodingTextInput) ? `("${geocodingTextInput}")` : ''
                    } n'est pas assez précis.</strong> Ajoutez de l'information ou précisez l'emplacement à l'aide de la carte.`,
                    en: `<strong>The location name used for searching ${
                        !_isBlank(geocodingTextInput) ? `("${geocodingTextInput}")` : ''
                    } is not specific enough.</strong> Please add more information or specify the location more precisely using the map.`
                }
            }
        ];
        return validations;
    },
    showSearchPlaceButton: (interview, path) => {
        // Do not show if the place is a shortcut
        const visitedPlace: any = getResponse(interview, path, null, '../');
        return _isBlank(visitedPlace.shortcut);
    },
    conditional: function (interview, path) {
        const visitedPlace: any = getResponse(interview, path, null, '../');
        const activity = visitedPlace.activity;
        const person = odSurveyHelpers.getActivePerson({ interview });
        if (activity === 'workUsual' && (person as any).usualWorkPlace && (person as any).usualWorkPlace.geography) {
            return [false, (person as any).usualWorkPlace.geography];
        }
        if (
            activity === 'schoolUsual' &&
            (person as any).usualSchoolPlace &&
            (person as any).usualSchoolPlace.geography
        ) {
            return [false, (person as any).usualSchoolPlace.geography];
        }
        const visitedPlaceAlreadyVisited = getResponse(
            interview,
            path,
            null,
            '../alreadyVisitedBySelfOrAnotherHouseholdMember'
        );
        return [
            !_isBlank(activity) &&
                ![...loopActivities, 'home'].includes(activity) &&
                !(visitedPlaceAlreadyVisited === 'yes' && _isBlank(visitedPlace.shortcut)),
            null
        ];
    }
};

const getSuffixTimes = (interview, timeField = 'arrivalTime') => {
    // return an object: {[secondsSinceMidnight (string)]: suffix (string)}
    const suffixTimes = {};
    const journey = odSurveyHelpers.getActiveJourney({ interview });
    const activeVisitedPlace = odSurveyHelpers.getActiveVisitedPlace({ interview, journey });
    const isShortcut = activeVisitedPlace && activeVisitedPlace.shortcut;
    if (isShortcut) {
        const shortcutVisitedPlace: any = getResponse(interview, activeVisitedPlace.shortcut, null);
        const shortcutVisitedPlacePerson = shortcutVisitedPlace
            ? getShortcutVisitedPlacePerson(shortcutVisitedPlace._uuid, interview)
            : null;
        if (
            shortcutVisitedPlace &&
            shortcutVisitedPlace[timeField] &&
            shortcutVisitedPlacePerson &&
            shortcutVisitedPlacePerson.nickname
        ) {
            suffixTimes[shortcutVisitedPlace[timeField].toString()] = ` (${_truncate(
                shortcutVisitedPlacePerson.nickname,
                { length: 10 }
            )})`;
        }
    }
    return suffixTimes;
};

export const visitedPlacePreviousPreviousDepartureTime: WidgetConfig.InputTimeType = {
    ...inputTimeBase,
    path: '_previousPreviousDepartureTime',
    twoColumns: false,
    containsHtml: true,
    addHourSeparators: true,
    minuteStep: 5,
    validations: validations.requiredValidation,
    conditional: function (interview, path) {
        const journey = odSurveyHelpers.getActiveJourney({ interview });
        const activeVisitedPlace = odSurveyHelpers.getActiveVisitedPlace({ interview, journey });
        const previousVisitedPlace = odSurveyHelpers.getPreviousVisitedPlace({
            journey,
            visitedPlaceId: activeVisitedPlace._uuid
        });
        if (
            previousVisitedPlace &&
            previousVisitedPlace.activity &&
            _isBlank(previousVisitedPlace.departureTime) &&
            activeVisitedPlace.activity === 'workOnTheRoad' &&
            (activeVisitedPlace as any).onTheRoadDepartureType === 'usualWorkPlace' &&
            previousVisitedPlace.activity !== 'workUsual'
        ) {
            return [true, null];
        }
        return [false, null];
    },
    suffixTimes(interview, path) {
        // return an object: {[secondsSinceMidnight (string)]: suffix (string)}
        const suffixTimes = {};
        const journey = odSurveyHelpers.getActiveJourney({ interview });
        const activeVisitedPlace = odSurveyHelpers.getActiveVisitedPlace({ interview, journey });
        const isShortcut = activeVisitedPlace && activeVisitedPlace.shortcut;
        if (isShortcut) {
            const shortcutVisitedPlace: any = getResponse(interview, activeVisitedPlace.shortcut, null);
            const shortcutVisitedPlacePerson = shortcutVisitedPlace
                ? getShortcutVisitedPlacePerson(shortcutVisitedPlace._uuid, interview)
                : null;
            if (
                shortcutVisitedPlace &&
                shortcutVisitedPlace.arrivalTime &&
                shortcutVisitedPlacePerson &&
                shortcutVisitedPlacePerson.nickname
            ) {
                suffixTimes[shortcutVisitedPlace.arrivalTime.toString()] = ` (${_truncate(
                    shortcutVisitedPlacePerson.nickname,
                    { length: 10 }
                )})`;
            }
        }
        return suffixTimes;
    },
    minTimeSecondsSinceMidnight: function (interview, path) {
        const journey = odSurveyHelpers.getActiveJourney({ interview });
        const activeVisitedPlace = odSurveyHelpers.getActiveVisitedPlace({ interview, journey });
        const visitedPlacesArray = odSurveyHelpers.getVisitedPlacesArray({ journey });
        // Start at 4 AM
        let lastTimeSecondsSinceMidnight = MIN_SECONDS_SINCE_MIDNIGHT;
        if (visitedPlacesArray.length > 0) {
            const visitedPlacesBeforeArray = visitedPlacesArray.filter((visitedPlace: any) => {
                return visitedPlace._sequence < activeVisitedPlace._sequence;
            });
            const previousTimes = visitedPlacesBeforeArray.map((visitedPlace: any) => {
                if (!_isBlank(visitedPlace.departureTime)) {
                    return visitedPlace.departureTime;
                } else if (!_isBlank(visitedPlace.arrivalTime)) {
                    return visitedPlace.arrivalTime;
                }
                return lastTimeSecondsSinceMidnight;
            });

            lastTimeSecondsSinceMidnight =
                previousTimes.length > 0 ? _max(previousTimes) : lastTimeSecondsSinceMidnight;
        }
        return lastTimeSecondsSinceMidnight;
    },
    maxTimeSecondsSinceMidnight: function (interview, path) {
        const journey = odSurveyHelpers.getActiveJourney({ interview });
        const activeVisitedPlace = odSurveyHelpers.getActiveVisitedPlace({ interview, journey });
        const visitedPlacesArray = odSurveyHelpers.getVisitedPlacesArray({ journey });
        // Start at 4 AM
        const visibleWidgets = (interview as any).visibleWidgets;
        if (
            !_isBlank((activeVisitedPlace as any)._previousArrivalTime) &&
            visibleWidgets.includes(path.replace('._previousPreviousDepartureTime', '._previousArrivalTime'))
        ) {
            return (activeVisitedPlace as any)._previousArrivalTime;
        } else if (
            !_isBlank((activeVisitedPlace as any)._previousDepartureTime) &&
            visibleWidgets.includes(path.replace('._previousPreviousDepartureTime', '._previousDepartureTime'))
        ) {
            return (activeVisitedPlace as any)._previousDepartureTime;
        } else if (
            !_isBlank((activeVisitedPlace as any).arrivalTime) &&
            visibleWidgets.includes(path.replace('._previousPreviousDepartureTime', '.arrivalTime'))
        ) {
            return (activeVisitedPlace as any).arrivalTime;
        } else if (
            !_isBlank((activeVisitedPlace as any).departureTime) &&
            visibleWidgets.includes(path.replace('._previousPreviousDepartureTime', '.departureTime'))
        ) {
            return (activeVisitedPlace as any).departureTime;
        }

        let lastTimeSecondsSinceMidnight = 27 * 3600 + 59 * 60 + 59;
        if (visitedPlacesArray.length > 0) {
            const visitedPlacesAfterArray = visitedPlacesArray.filter((visitedPlace: any) => {
                return visitedPlace._sequence > activeVisitedPlace._sequence;
            });

            const nextTimes = visitedPlacesAfterArray.map((visitedPlace: any) => {
                if (!_isBlank(visitedPlace.arrivalTime)) {
                    return visitedPlace.arrivalTime;
                } else if (!_isBlank(visitedPlace.departureTime)) {
                    return visitedPlace.departureTime;
                }
                return lastTimeSecondsSinceMidnight;
            });

            // also check active departure time:
            if (!_isBlank(activeVisitedPlace.departureTime)) {
                nextTimes.push(activeVisitedPlace.departureTime);
            }

            lastTimeSecondsSinceMidnight = nextTimes.length > 0 ? _min(nextTimes) : lastTimeSecondsSinceMidnight;
        }
        return lastTimeSecondsSinceMidnight;
    },
    label: (t: TFunction, interview, path) => {
        const person = odSurveyHelpers.getActivePerson({ interview });
        const journey = odSurveyHelpers.getActiveJourney({ interview });
        const activeVisitedPlace = odSurveyHelpers.getActiveVisitedPlace({ interview, journey });
        const previousVisitedPlace = odSurveyHelpers.getPreviousVisitedPlace({
            journey,
            visitedPlaceId: activeVisitedPlace._uuid
        });
        const onTheRoadDepartureType = (activeVisitedPlace as any).onTheRoadDepartureType;
        const visitedPlaceDescription = _escape(getVisitedPlaceDescription(activeVisitedPlace, false, false));

        if (previousVisitedPlace.activity === 'home' && onTheRoadDepartureType === 'usualWorkPlace') {
            return t('visitedPlaces:_previousPreviousDepartureTimeHomeToUsualWorkplace', {
                context: person?.gender || person?.sexAssignedAtBirth,
                nickname: _escape(person.nickname),
                visitedPlaceDescription,
                count: odSurveyHelpers.getCountOrSelfDeclared({ interview, person })
            });
        } else if (
            previousVisitedPlace.activity !== 'home' &&
            previousVisitedPlace.activity !== 'workUsual' &&
            onTheRoadDepartureType === 'usualWorkPlace'
        ) {
            return t('visitedPlaces:_previousPreviousDepartureTime', {
                context: person?.gender || person?.sexAssignedAtBirth,
                nickname: _escape(person.nickname),
                visitedPlaceDescription,
                count: odSurveyHelpers.getCountOrSelfDeclared({ interview, person })
            });
        }
    }
};

export const visitedPlacePreviousArrivalTime: WidgetConfig.InputTimeType = {
    ...inputTimeBase,
    path: '_previousArrivalTime',
    twoColumns: false,
    containsHtml: true,
    addHourSeparators: true,
    minuteStep: 5,
    validations: validations.requiredValidation,
    conditional: function (interview, path) {
        const journey = odSurveyHelpers.getActiveJourney({ interview });
        const activeVisitedPlace = odSurveyHelpers.getActiveVisitedPlace({ interview, journey });
        const previousVisitedPlace = odSurveyHelpers.getPreviousVisitedPlace({
            journey,
            visitedPlaceId: activeVisitedPlace._uuid
        });
        if (!previousVisitedPlace) {
            return [false, null];
        }
        if (
            activeVisitedPlace.activityCategory &&
            activeVisitedPlace.activity === 'workOnTheRoad' &&
            (activeVisitedPlace as any).onTheRoadDepartureType
        ) {
            if (
                (activeVisitedPlace as any).onTheRoadDepartureType === 'home' &&
                previousVisitedPlace.activity !== 'home'
            ) {
                return [true, null];
            } else if (
                (activeVisitedPlace as any).onTheRoadDepartureType === 'usualWorkPlace' &&
                previousVisitedPlace.activity !== 'workUsual'
            ) {
                return [true, null];
            }
        }
        return [false, null];
    },
    suffixTimes(interview, path) {
        // FIXME Is this the same as the previousPrevious one? If so, extract
        const suffixTimes = {};
        const journey = odSurveyHelpers.getActiveJourney({ interview });
        const activeVisitedPlace = odSurveyHelpers.getActiveVisitedPlace({ interview, journey });
        const isShortcut = activeVisitedPlace && activeVisitedPlace.shortcut;
        if (isShortcut) {
            const shortcutVisitedPlace: any = getResponse(interview, activeVisitedPlace.shortcut, null);
            const shortcutVisitedPlacePerson = shortcutVisitedPlace
                ? getShortcutVisitedPlacePerson(shortcutVisitedPlace._uuid, interview)
                : null;
            if (
                shortcutVisitedPlace &&
                shortcutVisitedPlace.arrivalTime &&
                shortcutVisitedPlacePerson &&
                shortcutVisitedPlacePerson.nickname
            ) {
                suffixTimes[shortcutVisitedPlace.arrivalTime.toString()] = ` (${_truncate(
                    shortcutVisitedPlacePerson.nickname,
                    { length: 10 }
                )})`;
            }
        }
        return suffixTimes;
    },
    minTimeSecondsSinceMidnight: function (interview, path) {
        const journey = odSurveyHelpers.getActiveJourney({ interview });
        const activeVisitedPlace = odSurveyHelpers.getActiveVisitedPlace({ interview, journey });
        const visibleWidgets = (interview as any).visibleWidgets;

        if (
            !_isBlank((activeVisitedPlace as any)._previousPreviousDepartureTime) &&
            visibleWidgets.includes(path.replace('._previousArrivalTime', '._previousPreviousDepartureTime'))
        ) {
            return (activeVisitedPlace as any)._previousPreviousDepartureTime;
        }

        // Start at 4 AM
        const visitedPlacesArray = odSurveyHelpers.getVisitedPlacesArray({ journey });
        let lastTimeSecondsSinceMidnight = MIN_SECONDS_SINCE_MIDNIGHT;
        if (visitedPlacesArray.length > 1) {
            const visitedPlacesBeforeArray = visitedPlacesArray.filter((visitedPlace: any) => {
                return visitedPlace._sequence < activeVisitedPlace._sequence;
            });
            const previousTimes = visitedPlacesBeforeArray.map((visitedPlace: any) => {
                if (!_isBlank(visitedPlace.departureTime)) {
                    return visitedPlace.departureTime;
                } else if (!_isBlank(visitedPlace.arrivalTime)) {
                    return visitedPlace.arrivalTime;
                }
                return lastTimeSecondsSinceMidnight;
            });

            lastTimeSecondsSinceMidnight =
                previousTimes.length > 0 ? _max(previousTimes) : lastTimeSecondsSinceMidnight;
        }
        return lastTimeSecondsSinceMidnight;
    },
    maxTimeSecondsSinceMidnight: function (interview, path) {
        const journey = odSurveyHelpers.getActiveJourney({ interview });
        const activeVisitedPlace = odSurveyHelpers.getActiveVisitedPlace({ interview, journey });
        const visibleWidgets = (interview as any).visibleWidgets;
        if (
            !_isBlank((activeVisitedPlace as any)._previousDepartureTime) &&
            visibleWidgets.includes(path.replace('._previousArrivalTime', '._previousDepartureTime'))
        ) {
            return (activeVisitedPlace as any)._previousDepartureTime;
        } else if (
            !_isBlank(activeVisitedPlace.arrivalTime) &&
            visibleWidgets.includes(path.replace('._previousArrivalTime', '.arrivalTime'))
        ) {
            return activeVisitedPlace.arrivalTime;
        } else if (
            !_isBlank(activeVisitedPlace.departureTime) &&
            visibleWidgets.includes(path.replace('._previousArrivalTime', '.departureTime'))
        ) {
            return activeVisitedPlace.departureTime;
        }

        const visitedPlacesArray = odSurveyHelpers.getVisitedPlacesArray({ journey });
        let lastTimeSecondsSinceMidnight = 27 * 3600 + 59 * 60 + 59;
        if (visitedPlacesArray.length > 0) {
            const visitedPlacesAfterArray = visitedPlacesArray.filter((visitedPlace: any) => {
                return visitedPlace._sequence > activeVisitedPlace._sequence;
            });

            const nextTimes = visitedPlacesAfterArray.map((visitedPlace: any) => {
                if (!_isBlank(visitedPlace.arrivalTime)) {
                    return visitedPlace.arrivalTime;
                } else if (!_isBlank(visitedPlace.departureTime)) {
                    return visitedPlace.departureTime;
                }
                return lastTimeSecondsSinceMidnight;
            });

            // also check active departure time:
            if (!_isBlank(activeVisitedPlace.departureTime)) {
                nextTimes.push(activeVisitedPlace.departureTime);
            }

            lastTimeSecondsSinceMidnight = nextTimes.length > 0 ? _min(nextTimes) : lastTimeSecondsSinceMidnight;
        }
        return lastTimeSecondsSinceMidnight;
    },
    label: (t: TFunction, interview, path) => {
        const person = odSurveyHelpers.getActivePerson({ interview });
        const journey = odSurveyHelpers.getActiveJourney({ interview });
        const activeVisitedPlace = odSurveyHelpers.getActiveVisitedPlace({ interview, journey });

        const onTheRoadDepartureType = (activeVisitedPlace as any).onTheRoadDepartureType;
        const visitedPlaceDescription = _escape(getVisitedPlaceDescription(activeVisitedPlace, false, false));
        const nickname = _escape(person.nickname);
        if (onTheRoadDepartureType === 'home') {
            return t('visitedPlaces:_previousArrivalTimeDepartureTypeHome', {
                context: person?.gender || person?.sexAssignedAtBirth,
                nickname,
                visitedPlaceDescription,
                count: odSurveyHelpers.getCountOrSelfDeclared({ interview, person })
            });
        } else if (onTheRoadDepartureType === 'usualWorkPlace') {
            return t('visitedPlaces:_previousArrivalTimeDepartureTypeUsualWorkPlace', {
                context: person?.gender || person?.sexAssignedAtBirth,
                nickname,
                visitedPlaceDescription,
                count: odSurveyHelpers.getCountOrSelfDeclared({ interview, person })
            });
        } else {
            return t('visitedPlaces:_previousArrivalTimeDepartureTypeOther', {
                context: person?.gender || person?.sexAssignedAtBirth,
                nickname,
                visitedPlaceDescription,
                count: odSurveyHelpers.getCountOrSelfDeclared({ interview, person })
            });
        }
    }
};

export const visitedPlacePreviousDepartureTime: WidgetConfig.InputTimeType = {
    ...inputTimeBase,
    path: '_previousDepartureTime',
    twoColumns: false,
    containsHtml: true,
    addHourSeparators: true,
    validations: validations.requiredValidation,
    minuteStep: (interview, path) => {
        const journey = odSurveyHelpers.getActiveJourney({ interview });
        const activeVisitedPlace = odSurveyHelpers.getActiveVisitedPlace({ interview, journey });
        const previousVisitedPlace = odSurveyHelpers.getPreviousVisitedPlace({
            journey,
            visitedPlaceId: activeVisitedPlace._uuid
        });
        return activeVisitedPlace._sequence === 2 && (previousVisitedPlace as any)._isNew !== false ? 15 : 5;
    },
    conditional: function (interview, path) {
        const journey = odSurveyHelpers.getActiveJourney({ interview });
        const activeVisitedPlace = odSurveyHelpers.getActiveVisitedPlace({ interview, journey });
        const previousVisitedPlace = odSurveyHelpers.getPreviousVisitedPlace({
            journey,
            visitedPlaceId: activeVisitedPlace._uuid
        });
        if (previousVisitedPlace && activeVisitedPlace.activity && _isBlank(previousVisitedPlace.departureTime)) {
            if (loopActivities.includes(activeVisitedPlace.activity)) {
                return [false, activeVisitedPlace.arrivalTime];
            }
            return [true, null];
        }
        return [false, null];
    },
    suffixTimes(interview, path) {
        // return an object: {[secondsSinceMidnight (string)]: suffix (string)}
        const suffixTimes = {};
        const journey = odSurveyHelpers.getActiveJourney({ interview });
        const activeVisitedPlace = odSurveyHelpers.getActiveVisitedPlace({ interview, journey });
        const isShortcut = activeVisitedPlace && activeVisitedPlace.shortcut;
        if (isShortcut) {
            const shortcutVisitedPlace: any = getResponse(interview, activeVisitedPlace.shortcut, null);
            const shortcutVisitedPlacePerson = shortcutVisitedPlace
                ? getShortcutVisitedPlacePerson(shortcutVisitedPlace._uuid, interview)
                : null;
            if (
                shortcutVisitedPlace &&
                shortcutVisitedPlace.arrivalTime &&
                shortcutVisitedPlacePerson &&
                shortcutVisitedPlacePerson.nickname
            ) {
                suffixTimes[shortcutVisitedPlace.arrivalTime.toString()] = ` (${_truncate(
                    shortcutVisitedPlacePerson.nickname,
                    { length: 10 }
                )})`;
            }
        }
        return suffixTimes;
    },
    minTimeSecondsSinceMidnight: function (interview, path) {
        const journey = odSurveyHelpers.getActiveJourney({ interview });
        const activeVisitedPlace = odSurveyHelpers.getActiveVisitedPlace({ interview, journey });
        const visibleWidgets = (interview as any).visibleWidgets;
        if (
            !_isBlank((activeVisitedPlace as any)._previousArrivalTime) &&
            visibleWidgets.includes(path.replace('._previousDepartureTime', '._previousArrivalTime'))
        ) {
            return (activeVisitedPlace as any)._previousArrivalTime;
        } else if (
            !_isBlank((activeVisitedPlace as any)._previousPreviousDepartureTime) &&
            visibleWidgets.includes(path.replace('._previousDepartureTime', '._previousPreviousDepartureTime'))
        ) {
            return (activeVisitedPlace as any)._previousPreviousDepartureTime;
        }

        const visitedPlacesArray = odSurveyHelpers.getVisitedPlacesArray({ journey });
        // Start at 4 AM
        let lastTimeSecondsSinceMidnight = MIN_SECONDS_SINCE_MIDNIGHT;
        if (visitedPlacesArray.length > 0) {
            const visitedPlacesBeforeArray = visitedPlacesArray.filter((visitedPlace: any) => {
                return visitedPlace._sequence < activeVisitedPlace._sequence;
            });
            const previousTimes = visitedPlacesBeforeArray.map((visitedPlace) => {
                if (!_isBlank(visitedPlace.departureTime)) {
                    return visitedPlace.departureTime;
                } else if (!_isBlank(visitedPlace.arrivalTime)) {
                    return visitedPlace.arrivalTime;
                }
                return lastTimeSecondsSinceMidnight;
            });

            lastTimeSecondsSinceMidnight =
                previousTimes.length > 0 ? _max(previousTimes) : lastTimeSecondsSinceMidnight;
        }
        return lastTimeSecondsSinceMidnight;
    },
    maxTimeSecondsSinceMidnight: function (interview, path) {
        const journey = odSurveyHelpers.getActiveJourney({ interview });
        const activeVisitedPlace = odSurveyHelpers.getActiveVisitedPlace({ interview, journey });
        const visibleWidgets = (interview as any).visibleWidgets;
        if (
            !_isBlank(activeVisitedPlace.arrivalTime) &&
            visibleWidgets.includes(path.replace('._previousDepartureTime', '.arrivalTime'))
        ) {
            return activeVisitedPlace.arrivalTime;
        } else if (
            !_isBlank(activeVisitedPlace.departureTime) &&
            visibleWidgets.includes(path.replace('._previousDepartureTime', '.departureTime'))
        ) {
            return activeVisitedPlace.departureTime;
        }

        const visitedPlacesArray = odSurveyHelpers.getVisitedPlacesArray({ journey });

        let lastTimeSecondsSinceMidnight = MAX_SECONDS_SINCE_MIDNIGHT - 1; // 27:59:59
        if (visitedPlacesArray.length > 0) {
            const visitedPlacesAfterArray = visitedPlacesArray.filter((visitedPlace: any) => {
                return visitedPlace._sequence > activeVisitedPlace._sequence;
            });

            const nextTimes = visitedPlacesAfterArray.map((visitedPlace: any) => {
                if (!_isBlank(visitedPlace.arrivalTime)) {
                    return visitedPlace.arrivalTime;
                } else if (!_isBlank(visitedPlace.departureTime)) {
                    return visitedPlace.departureTime;
                }
                return lastTimeSecondsSinceMidnight;
            });

            // also check active departure time:
            if (!_isBlank(activeVisitedPlace.departureTime)) {
                nextTimes.push(activeVisitedPlace.departureTime);
            }

            lastTimeSecondsSinceMidnight = nextTimes.length > 0 ? _min(nextTimes) : lastTimeSecondsSinceMidnight;
        }
        return lastTimeSecondsSinceMidnight;
    },
    label: (t: TFunction, interview, path) => {
        const person = odSurveyHelpers.getActivePerson({ interview });
        const journey = odSurveyHelpers.getActiveJourney({ interview });
        const activeVisitedPlace = odSurveyHelpers.getActiveVisitedPlace({ interview, journey });
        const previousVisitedPlace = odSurveyHelpers.getPreviousVisitedPlace({
            journey,
            visitedPlaceId: activeVisitedPlace._uuid
        });

        const onTheRoadDepartureType = (activeVisitedPlace as any).onTheRoadDepartureType;
        const visitedPlaceDescription = _escape(getVisitedPlaceDescription(activeVisitedPlace, false, false));
        const previousVisitedPlaceDescription = _escape(getVisitedPlaceDescription(previousVisitedPlace, false, false));

        let key = 'visitedPlaces:PreviousDepartureTime';
        if (previousVisitedPlace.activity === 'home' && activeVisitedPlace.activity === 'workUsual') {
            key = 'visitedPlaces:PreviousDepartureTime_home_workUsual';
        } else if (previousVisitedPlace.activity === 'home' && activeVisitedPlace.activity === 'schoolUsual') {
            key = 'visitedPlaces:PreviousDepartureTime_home_schoolUsual';
        } else if (
            previousVisitedPlace.activity === 'home' &&
            previousVisitedPlace._sequence === 1 &&
            !loopActivities.includes(activeVisitedPlace.activity)
        ) {
            key = 'visitedPlaces:PreviousDepartureTime_home_other';
        } else if (previousVisitedPlace.activity === 'home' && activeVisitedPlace.activity === 'workOnTheRoad') {
            key = 'visitedPlaces:PreviousDepartureTime_home_workOnTheRoad';
        } else if (onTheRoadDepartureType === 'usualWorkPlace' && activeVisitedPlace.activity === 'workOnTheRoad') {
            key = 'visitedPlaces:PreviousDepartureTime_usualWorkPlace_workOnTheRoad';
        }
        return t(key, {
            context: person?.gender || person?.sexAssignedAtBirth,
            nickname: _escape(person.nickname),
            count: odSurveyHelpers.getCountOrSelfDeclared({ interview, person }),
            previousVisitedPlaceDescription,
            visitedPlaceDescription
        });
    }
};

export const visitedPlaceArrivalTime: WidgetConfig.InputTimeType = {
    ...inputTimeBase,
    path: 'arrivalTime',
    twoColumns: false,
    containsHtml: true,
    addHourSeparators: true,
    minuteStep: 5,
    validations: validations.requiredValidation,
    conditional: function (interview, path) {
        const journey = odSurveyHelpers.getActiveJourney({ interview });
        const activeVisitedPlace = odSurveyHelpers.getActiveVisitedPlace({ interview, journey });
        const previousVisitedPlace = odSurveyHelpers.getPreviousVisitedPlace({
            journey,
            visitedPlaceId: activeVisitedPlace._uuid
        });
        const previousArrivalTime = (activeVisitedPlace as any)._previousArrivalTime;
        const previousArrivalTimeIsVisible = (interview as any).visibleWidgets.includes(
            path.replace('departureTime', '_previousArrivalTime')
        );

        if ((activeVisitedPlace as any).onTheRoadDepartureType === 'home' && previousVisitedPlace.activity !== 'home') {
            return [true, null];
        } else if (
            (activeVisitedPlace as any).onTheRoadDepartureType === 'usualWorkPlace' &&
            previousVisitedPlace.activity !== 'workUsual'
        ) {
            return [true, null];
        }
        if (previousArrivalTimeIsVisible && _isBlank(previousArrivalTime)) {
            return [false, null];
        }
        if (
            previousVisitedPlace &&
            loopActivities.includes(activeVisitedPlace.activity) &&
            !_isBlank(previousVisitedPlace.departureTime)
        ) {
            return [false, previousVisitedPlace.departureTime];
        }
        if (
            previousVisitedPlace &&
            loopActivities.includes(previousVisitedPlace.activity) &&
            !_isBlank(previousVisitedPlace.departureTime)
        ) {
            return [false, previousVisitedPlace.departureTime];
        }
        return [activeVisitedPlace.activity && activeVisitedPlace._sequence > 1, null];
    },
    suffixTimes(interview, path) {
        const suffixTimes = getSuffixTimes(interview, 'arrivalTime');
        suffixTimes[MAX_SECONDS_SINCE_MIDNIGHT] = ' ' + i18n.t('survey:orPlus');

        // Add round travel time suffixes up to 2 hours
        // disable suffix for now: TODO: find a better way to show travel times?
        /*if (activeVisitedPlace._sequence && activeVisitedPlace._sequence > 1) {
            const person = helper.getPerson(interview);
            const visitedPlaces = helper.getVisitedPlaces(person, null, true);
            const lastVisitedPlace = visitedPlaces[activeVisitedPlace._sequence - 2];
            if (!_isBlank(lastVisitedPlace) && !_isBlank(lastVisitedPlace.departureTime)) {
                const roundTimes = {
                    '(15min)': 15,
                    '(30min)': 30,
                    '(45min)': 45,
                    '(1h)': 60,
                    '(1h15)': 75,
                    '(1h30)': 90,
                    '(1h45)': 105,
                    '(2h)': 120
                };
                Object.keys(roundTimes).forEach(roundTimeStr => {
                    const timeStr = (lastVisitedPlace.departureTime + (roundTimes[roundTimeStr] * 60)).toString();
                    suffixTimes[timeStr] = suffixTimes[timeStr] !== undefined ? ` ${roundTimeStr} ${suffixTimes[timeStr]}` : ` ${roundTimeStr}`;
                });
            }
        }*/

        return suffixTimes;
    },
    minTimeSecondsSinceMidnight: function (interview, path) {
        const journey = odSurveyHelpers.getActiveJourney({ interview });
        const activeVisitedPlace = odSurveyHelpers.getActiveVisitedPlace({ interview, journey });

        // FIXME This deserves a comment. Why? It was copy-pasted, but seriously, what does this do? Why only if the widget is visible?
        const visibleWidgets = (interview as any).visibleWidgets;
        if (
            !_isBlank((activeVisitedPlace as any)._previousDepartureTime) &&
            visibleWidgets.includes(path.replace('.arrivalTime', '._previousDepartureTime'))
        ) {
            return (activeVisitedPlace as any)._previousDepartureTime;
        } else if (
            !_isBlank((activeVisitedPlace as any)._previousArrivalTime) &&
            visibleWidgets.includes(path.replace('.arrivalTime', '._previousArrivalTime'))
        ) {
            return (activeVisitedPlace as any)._previousArrivalTime;
        } else if (
            !_isBlank((activeVisitedPlace as any)._previousPreviousDepartureTime) &&
            visibleWidgets.includes(path.replace('.arrivalTime', '._previousPreviousDepartureTime'))
        ) {
            return (activeVisitedPlace as any)._previousPreviousDepartureTime;
        }

        const visitedPlacesArray = odSurveyHelpers.getVisitedPlacesArray({ journey });
        let lastTimeSecondsSinceMidnight = MIN_SECONDS_SINCE_MIDNIGHT;
        if (visitedPlacesArray.length > 0) {
            const visitedPlacesBeforeArray = visitedPlacesArray.filter((visitedPlace: any) => {
                return visitedPlace._sequence < activeVisitedPlace._sequence;
            });

            const previousTimes = visitedPlacesBeforeArray.map((visitedPlace: any) => {
                if (!_isBlank(visitedPlace.departureTime)) {
                    return visitedPlace.departureTime;
                } else if (!_isBlank(visitedPlace.arrivalTime)) {
                    return visitedPlace.arrivalTime;
                }
                return lastTimeSecondsSinceMidnight;
            });

            lastTimeSecondsSinceMidnight =
                previousTimes.length > 0 ? _max(previousTimes) : lastTimeSecondsSinceMidnight;
        }
        return lastTimeSecondsSinceMidnight;
    },
    maxTimeSecondsSinceMidnight: function (interview, path) {
        const journey = odSurveyHelpers.getActiveJourney({ interview });
        const activeVisitedPlace = odSurveyHelpers.getActiveVisitedPlace({ interview, journey });
        const visibleWidgets = (interview as any).visibleWidgets;

        if (
            !_isBlank(activeVisitedPlace.departureTime) &&
            visibleWidgets.includes(path.replace('.arrivalTime', '.departureTime'))
        ) {
            return activeVisitedPlace.departureTime;
        }

        const visitedPlacesArray = odSurveyHelpers.getVisitedPlacesArray({ journey });
        //let lastTimeSecondsSinceMidnight = 27 * 3600 + 59 * 60 + 59;
        // include 4:00 for later trips:
        let lastTimeSecondsSinceMidnight = MAX_SECONDS_SINCE_MIDNIGHT;
        if (visitedPlacesArray.length > 0) {
            const visitedPlacesAfterArray = visitedPlacesArray.filter((visitedPlace: any) => {
                return visitedPlace._sequence > activeVisitedPlace._sequence;
            });

            const nextTimes = visitedPlacesAfterArray.map((visitedPlace: any) => {
                if (!_isBlank(visitedPlace.arrivalTime)) {
                    return visitedPlace.arrivalTime;
                } else if (!_isBlank(visitedPlace.departureTime)) {
                    return visitedPlace.departureTime;
                }
                return lastTimeSecondsSinceMidnight;
            });

            // also check active departure time:
            if (!_isBlank(activeVisitedPlace.departureTime)) {
                nextTimes.push(activeVisitedPlace.departureTime);
            }

            lastTimeSecondsSinceMidnight = nextTimes.length > 0 ? _min(nextTimes) : lastTimeSecondsSinceMidnight;
        }
        return lastTimeSecondsSinceMidnight;
    },
    label: (t: TFunction, interview, path) => {
        const person = odSurveyHelpers.getActivePerson({ interview });
        const journey = odSurveyHelpers.getActiveJourney({ interview });
        const activeVisitedPlace = odSurveyHelpers.getActiveVisitedPlace({ interview, journey });
        const visitedPlaceName = activeVisitedPlace?.name;

        const previousVisitedPlace = odSurveyHelpers.getPreviousVisitedPlace({
            journey,
            visitedPlaceId: activeVisitedPlace._uuid
        });
        const previousVisitedPlaceDepartureTime = (activeVisitedPlace as any)._previousDepartureTime
            ? (activeVisitedPlace as any)._previousDepartureTime
            : previousVisitedPlace
                ? previousVisitedPlace.departureTime
                : null;
        let durationText = '';
        if (
            previousVisitedPlaceDepartureTime &&
            activeVisitedPlace._sequence &&
            activeVisitedPlace._sequence > 1 &&
            !(activeVisitedPlace as any)._previousArrivalTime &&
            !loopActivities.includes(activeVisitedPlace.activity) &&
            (!previousVisitedPlace || !loopActivities.includes(previousVisitedPlace.activity))
        ) {
            durationText = formatTripDuration(
                activeVisitedPlace.arrivalTime,
                previousVisitedPlaceDepartureTime,
                i18n.language
            );
        }

        let key = 'visitedPlaces:arrivalTime';
        if (activeVisitedPlace && activeVisitedPlace.activity === 'workOnTheRoad') {
            key = 'visitedPlaces:arrivalTimeOnTheRoad';
        } else if (activeVisitedPlace && activeVisitedPlace.activity === 'leisureStroll') {
            key = 'visitedPlaces:arrivalTimeStroll';
        }
        const place = !_isBlank(visitedPlaceName)
            ? t('survey:atPlace', { placeName: _escape(visitedPlaceName) })
            : t('survey:atThisPlace', { context: activeVisitedPlace.activity });
        return (
            t(key, {
                context: person?.gender || person?.sexAssignedAtBirth,
                nickname: _escape(person.nickname),
                atPlace: place,
                count: odSurveyHelpers.getCountOrSelfDeclared({ interview, person })
            }) + durationText
        );
    }
};

export const visitedPlaceNextPlaceCategory: WidgetConfig.InputRadioType = {
    type: 'question',
    inputType: 'radio',
    path: 'nextPlaceCategory',
    datatype: 'string',
    twoColumns: false,
    sameLine: false,
    containsHtml: true,
    label: (t: TFunction, interview, path) => {
        const person = odSurveyHelpers.getActivePerson({ interview });
        const journey = odSurveyHelpers.getActiveJourney({ interview });
        const activeVisitedPlace = odSurveyHelpers.getActiveVisitedPlace({ interview, journey });
        const visitedPlaceName = activeVisitedPlace?.name;
        const atPlace = !_isBlank(visitedPlaceName)
            ? t('survey:atPlace', { placeName: _escape(visitedPlaceName) })
            : t('survey:atThisPlace', { context: activeVisitedPlace.activity });
        return t('visitedPlaces:nextPlaceCategory', {
            context: person?.gender || person?.sexAssignedAtBirth,
            nickname: _escape(person.nickname),
            atPlace,
            count: odSurveyHelpers.getCountOrSelfDeclared({ interview, person })
        });
    },
    choices: [
        {
            value: 'wentBackHome',
            label: (t: TFunction, interview, path) => {
                const person = odSurveyHelpers.getActivePerson({ interview });
                const homeAddress = getHomeAddressOneLine(interview);
                return t('visitedPlaces:nextPlaceRadioChoices.wentBackHome', {
                    address: homeAddress,
                    context: person?.gender || person?.sexAssignedAtBirth
                });
            },
            conditional: function (interview) {
                const journey = odSurveyHelpers.getActiveJourney({ interview });
                const activeVisitedPlace = odSurveyHelpers.getActiveVisitedPlace({ interview, journey });
                return activeVisitedPlace.activity !== 'home' && activeVisitedPlace.activity !== 'workOnTheRoad';
            }
        },
        {
            value: 'visitedAnotherPlace',
            label: (t: TFunction, interview) => {
                const person = odSurveyHelpers.getActivePerson({ interview });
                return t('visitedPlaces:nextPlaceRadioChoices.visitedAnotherPlace', {
                    context: person?.gender || person?.sexAssignedAtBirth
                });
            }
        },
        {
            value: 'stayedThereUntilTheNextDay',
            label: (t: TFunction, interview, path) => {
                const person = odSurveyHelpers.getActivePerson({ interview });
                const journey = odSurveyHelpers.getActiveJourney({ interview });
                const activeVisitedPlace = odSurveyHelpers.getActiveVisitedPlace({ interview, journey });
                if (activeVisitedPlace.activityCategory === 'home') {
                    return t('visitedPlaces:nextPlaceRadioChoices.stayedHomeUntilTheNextDay', {
                        context: person?.gender || person?.sexAssignedAtBirth
                    });
                } else {
                    return t('visitedPlaces:nextPlaceRadioChoices.stayedThereUntilTheNextDay', {
                        context: person?.gender || person?.sexAssignedAtBirth
                    });
                }
            },
            conditional: function (interview) {
                const journey = odSurveyHelpers.getActiveJourney({ interview });
                const activeVisitedPlace = odSurveyHelpers.getActiveVisitedPlace({ interview, journey });
                const visitedPlacesArray = odSurveyHelpers.getVisitedPlacesArray({ journey });
                return (
                    visitedPlacesArray.length > 1 &&
                    visitedPlacesArray[visitedPlacesArray.length - 1]._uuid === activeVisitedPlace._uuid
                );
            }
        },
        {
            label: '',
            value: 'wentToUsualWorkPlace',
            hidden: true // used for workOnTheRoad trips only, imputed
        }
    ],
    validations: validations.requiredValidation,
    conditional: function (interview, path) {
        const journey = odSurveyHelpers.getActiveJourney({ interview });
        const activeVisitedPlace = odSurveyHelpers.getActiveVisitedPlace({ interview, journey });
        const nextVisitedPlace = odSurveyHelpers.getNextVisitedPlace({
            journey,
            visitedPlaceId: activeVisitedPlace._uuid
        });
        const visitedPlacesArray = odSurveyHelpers.getVisitedPlacesArray({ journey });
        if (activeVisitedPlace.arrivalTime && activeVisitedPlace.arrivalTime === MAX_SECONDS_SINCE_MIDNIGHT) {
            return [false, 'stayedThereUntilTheNextDay'];
        }
        if (
            loopActivities.includes(activeVisitedPlace.activity) &&
            (activeVisitedPlace as any).onTheRoadArrivalType === 'stayedThereUntilTheNextDay'
        ) {
            return [false, 'stayedThereUntilTheNextDay'];
        }
        if (
            activeVisitedPlace.activity &&
            visitedPlacesArray[visitedPlacesArray.length - 1]._uuid === activeVisitedPlace._uuid &&
            activeVisitedPlace.activity !== 'workOnTheRoad'
        ) {
            // last vp
            return [true, null];
        }
        if (!nextVisitedPlace) {
            return [false, null];
        }
        return [
            activeVisitedPlace.activity && !nextVisitedPlace && !loopActivities.includes(activeVisitedPlace.activity),
            null
        ];
    }
};

export const visitedPlaceDepartureTime: WidgetConfig.InputTimeType = {
    ...inputTimeBase,
    path: 'departureTime',
    twoColumns: false,
    containsHtml: true,
    addHourSeparators: true,
    validations: validations.requiredValidation,
    minuteStep: (interview, path) => {
        const visitedPlace: any = getResponse(interview, path, null, '../');
        return visitedPlace._sequence === 1 && visitedPlace._isNew !== false ? 15 : 5;
    },
    conditional: function (interview, path) {
        const journey = odSurveyHelpers.getActiveJourney({ interview });
        const activeVisitedPlace = odSurveyHelpers.getActiveVisitedPlace({ interview, journey });
        if (
            activeVisitedPlace.activity &&
            (activeVisitedPlace as any).onTheRoadArrivalType &&
            (activeVisitedPlace as any).onTheRoadArrivalType !== 'stayedThereUntilTheNextDay'
        ) {
            return [true, null];
        }

        const visitedPlacesArray = odSurveyHelpers.getVisitedPlacesArray({ journey });
        if (
            _isBlank((activeVisitedPlace as any).nextPlaceCategory) &&
            visitedPlacesArray.length > 1 &&
            visitedPlacesArray[visitedPlacesArray.length - 1]._uuid === activeVisitedPlace._uuid
        ) {
            return [false, null];
        }
        return [
            activeVisitedPlace.activityCategory &&
                (activeVisitedPlace._sequence === 1 ||
                    (activeVisitedPlace as any).nextPlaceCategory !== 'stayedThereUntilTheNextDay'),
            null
        ];
    },
    suffixTimes(interview, path) {
        return getSuffixTimes(interview, 'departureTime');
    },
    minTimeSecondsSinceMidnight: function (interview, path) {
        const journey = odSurveyHelpers.getActiveJourney({ interview });
        const activeVisitedPlace = odSurveyHelpers.getActiveVisitedPlace({ interview, journey });
        const visibleWidgets = (interview as any).visibleWidgets;
        if (
            !_isBlank(activeVisitedPlace.arrivalTime) &&
            visibleWidgets.includes(path.replace('.departureTime', '.arrivalTime'))
        ) {
            return activeVisitedPlace.arrivalTime;
        } else if (
            !_isBlank((activeVisitedPlace as any)._previousDepartureTime) &&
            visibleWidgets.includes(path.replace('.departureTime', '._previousDepartureTime'))
        ) {
            return (activeVisitedPlace as any)._previousDepartureTime;
        } else if (
            !_isBlank((activeVisitedPlace as any)._previousArrivalTime) &&
            visibleWidgets.includes(path.replace('.departureTime', '._previousArrivalTime'))
        ) {
            return (activeVisitedPlace as any)._previousArrivalTime;
        } else if (
            !_isBlank((activeVisitedPlace as any)._previousPreviousDepartureTime) &&
            visibleWidgets.includes(path.replace('.departureTime', '._previousPreviousDepartureTime'))
        ) {
            return (activeVisitedPlace as any)._previousPreviousDepartureTime;
        }

        // Start at 4 AM
        let lastTimeSecondsSinceMidnight = MIN_SECONDS_SINCE_MIDNIGHT;
        const visitedPlacesArray = odSurveyHelpers.getVisitedPlacesArray({ journey });
        if (visitedPlacesArray.length > 0) {
            const visitedPlacesBeforeArray = visitedPlacesArray.filter((visitedPlace: any) => {
                return visitedPlace._sequence < activeVisitedPlace._sequence;
            });

            const previousTimes = visitedPlacesBeforeArray.map((visitedPlace: any) => {
                if (!_isBlank(visitedPlace.departureTime)) {
                    return visitedPlace.departureTime;
                } else if (!_isBlank(visitedPlace.arrivalTime)) {
                    return visitedPlace.arrivalTime;
                }
                return lastTimeSecondsSinceMidnight;
            });

            lastTimeSecondsSinceMidnight =
                previousTimes.length > 0 ? _max(previousTimes) : lastTimeSecondsSinceMidnight;
        }
        return lastTimeSecondsSinceMidnight;
    },
    maxTimeSecondsSinceMidnight: function (interview, path) {
        const journey = odSurveyHelpers.getActiveJourney({ interview });
        const activeVisitedPlace = odSurveyHelpers.getActiveVisitedPlace({ interview, journey });
        const visitedPlacesArray = odSurveyHelpers.getVisitedPlacesArray({ journey });
        let lastTimeSecondsSinceMidnight = 27 * 3600 + 59 * 60 + 59;
        if (visitedPlacesArray.length > 0) {
            const visitedPlacesAfterArray = visitedPlacesArray.filter((visitedPlace: any) => {
                return (
                    visitedPlace._sequence > activeVisitedPlace._sequence &&
                    !loopActivities.includes(visitedPlace.activity)
                );
            });
            const isMovingActivity = loopActivities.includes(activeVisitedPlace.activity);
            const nextTimes = visitedPlacesAfterArray.map((visitedPlace: any) => {
                // Use arrivalTime if available and the activity is not a moving activity, otherwise, prefer departure time
                if (!_isBlank(visitedPlace.arrivalTime) && !isMovingActivity) {
                    return visitedPlace.arrivalTime;
                } else if (!_isBlank(visitedPlace.departureTime)) {
                    return visitedPlace.departureTime;
                }
                return lastTimeSecondsSinceMidnight;
            });

            lastTimeSecondsSinceMidnight = nextTimes.length > 0 ? _min(nextTimes) : lastTimeSecondsSinceMidnight;
        }
        return lastTimeSecondsSinceMidnight;
    },
    label: (t: TFunction, interview, path) => {
        const person = odSurveyHelpers.getActivePerson({ interview });
        const nickname = _escape(person.nickname);
        const journey = odSurveyHelpers.getActiveJourney({ interview });
        const visitedPlace = odSurveyHelpers.getActiveVisitedPlace({ interview, journey });
        const previousVisitedPlace = odSurveyHelpers.getPreviousVisitedPlace({
            journey,
            visitedPlaceId: visitedPlace._uuid
        });

        const previousVisitedPlaceDepartureTime = (visitedPlace as any)._previousDepartureTime
            ? (visitedPlace as any)._previousDepartureTime
            : previousVisitedPlace
                ? previousVisitedPlace.departureTime
                : null;
        let durationText = '';
        if (
            previousVisitedPlaceDepartureTime &&
            visitedPlace._sequence &&
            visitedPlace._sequence > 1 &&
            !!previousVisitedPlace &&
            loopActivities.includes(previousVisitedPlace.activity)
        ) {
            durationText = formatTripDuration(
                visitedPlace.arrivalTime,
                previousVisitedPlaceDepartureTime,
                i18n.language
            );
        }
        if (visitedPlace.activity === 'workOnTheRoad') {
            return (
                t('visitedPlaces:departureTimeOnTheRoad', {
                    context: person?.gender || person?.sexAssignedAtBirth,
                    nickname,
                    count: odSurveyHelpers.getCountOrSelfDeclared({ interview, person })
                }) + durationText
            );
        } else if (visitedPlace.activity === 'leisureStroll') {
            return (
                t('visitedPlaces:departureTimeStroll', {
                    context: person?.gender || person?.sexAssignedAtBirth,
                    nickname,
                    count: odSurveyHelpers.getCountOrSelfDeclared({ interview, person })
                }) + durationText
            );
        }

        const visitedPlaceName = visitedPlace.name;
        const place =
            visitedPlace.activity === 'home' || visitedPlace.activityCategory === 'home'
                ? t('survey:theHome')
                : !_isBlank(visitedPlaceName)
                    ? t('survey:place', { placeName: _escape(visitedPlaceName) })
                    : t('survey:thisPlace', { context: visitedPlace.activity });
        return t('visitedPlaces:departureTime', {
            context: person?.gender || person?.sexAssignedAtBirth,
            nickname,
            count: odSurveyHelpers.getCountOrSelfDeclared({ interview, person }),
            place: place
        });
    }
};

export const buttonSaveVisitedPlace: WidgetConfig.ButtonWidgetConfig = {
    type: 'button',
    color: 'green',
    label: (t: TFunction) => t('main:Confirm'),
    hideWhenRefreshing: true,
    path: 'saveVisitedPlace',
    icon: faCheckCircle,
    align: 'center',
    saveCallback: function (
        callbacks: WidgetConfig.InterviewUpdateCallbacks,
        interview: WidgetConfig.UserInterviewAttributes,
        path: string
    ) {
        // FIXME There's a lot of redundant code in this function, refactor when
        // we have time and see if we really need that many calls to
        // startUpdateInterview
        const person = odSurveyHelpers.getPerson({ interview }) as any;
        const currentJourney = odSurveyHelpers.getActiveJourney({ interview, person });
        const visitedPlace = odSurveyHelpers.getActiveVisitedPlace({ interview, journey: currentJourney });
        const visitedPlacePath = `household.persons.${person._uuid}.journeys.${currentJourney._uuid}.visitedPlaces.${visitedPlace._uuid}`;
        const previousVisitedPlace = odSurveyHelpers.getPreviousVisitedPlace({
            visitedPlaceId: visitedPlace._uuid,
            journey: currentJourney
        }) as any;
        const previousVisitedPlacePath = previousVisitedPlace
            ? `household.persons.${person._uuid}.journeys.${currentJourney._uuid}.visitedPlaces.${previousVisitedPlace._uuid}`
            : null;
        const nextVisitedPlace = odSurveyHelpers.getNextVisitedPlace({
            visitedPlaceId: visitedPlace._uuid,
            journey: currentJourney
        }) as any;
        const nextVisitedPlacePath = nextVisitedPlace
            ? `household.persons.${person._uuid}.journeys.${currentJourney._uuid}.visitedPlaces.${nextVisitedPlace._uuid}`
            : null;
        const updateValuesbyPath = {};

        // for on the road with insertion between previous and on the road vp:
        if (
            previousVisitedPlace &&
            _isBlank(previousVisitedPlace.departureTime) &&
            !_isBlank((visitedPlace as any)._previousPreviousDepartureTime)
        ) {
            updateValuesbyPath[`response.${previousVisitedPlacePath}.departureTime`] = (
                visitedPlace as any
            )._previousPreviousDepartureTime;
            updateValuesbyPath[`response.${previousVisitedPlacePath}._isNew`] = false;
        } else if (
            previousVisitedPlace &&
            _isBlank(previousVisitedPlace.departureTime) &&
            !_isBlank((visitedPlace as any)._previousDepartureTime)
        ) {
            updateValuesbyPath[`response.${previousVisitedPlacePath}.departureTime`] = (
                visitedPlace as any
            )._previousDepartureTime;
            updateValuesbyPath[`response.${previousVisitedPlacePath}._isNew`] = false;
        }
        updateValuesbyPath[`response.${visitedPlacePath}._isNew`] = false;

        // Match arrival/departure time of moving activities with the previous/next times
        if (
            nextVisitedPlace &&
            (loopActivities.includes(nextVisitedPlace.activity) || loopActivities.includes(visitedPlace.activity))
        ) {
            updateValuesbyPath[`response.${nextVisitedPlacePath}.arrivalTime`] = visitedPlace.departureTime;
        }

        let addedGroupedObjectBefore = undefined;
        let addedGroupedObjectAfter = undefined;

        // on the road departure: home but previous is not home: insert home before on the road:
        if (
            (visitedPlace as any).onTheRoadDepartureType === 'home' &&
            (!previousVisitedPlace || previousVisitedPlace.activity !== 'home')
        ) {
            addedGroupedObjectBefore = {
                sequence: visitedPlace._sequence,
                path: `household.persons.${person._uuid}.journeys.${currentJourney._uuid}.visitedPlaces`,
                object: {
                    activity: 'home',
                    activityCategory: 'home',
                    nextPlaceCategory: 'visitedAnotherPlace',
                    arrivalTime: (visitedPlace as any)._previousArrivalTime
                        ? (visitedPlace as any)._previousArrivalTime
                        : undefined,
                    departureTime: loopActivities.includes(visitedPlace.activity) ? visitedPlace.arrivalTime : undefined
                }
            };

            // on the road departure: usual work place but previous is not workUsual: insert work usual before on the road:
        } else if (
            (visitedPlace as any).onTheRoadDepartureType === 'usualWorkPlace' &&
            (!previousVisitedPlace || previousVisitedPlace.activity !== 'workUsual')
        ) {
            addedGroupedObjectBefore = {
                sequence: visitedPlace._sequence,
                path: `household.persons.${person._uuid}.journeys.${currentJourney._uuid}.visitedPlaces`,
                object: {
                    activity: 'workUsual',
                    activityCategory: 'work',
                    nextPlaceCategory: 'visitedAnotherPlace',
                    arrivalTime: (visitedPlace as any)._previousArrivalTime
                        ? (visitedPlace as any)._previousArrivalTime
                        : undefined,
                    departureTime: visitedPlace.activity === 'workOnTheRoad' ? visitedPlace.arrivalTime : undefined
                }
            };
        }

        // next place category or on the road arrival type is workUsual but next is not workUsusal: insert workUsual after:
        if (
            ((visitedPlace as any).nextPlaceCategory === 'wentToUsualWorkPlace' ||
                (visitedPlace as any).onTheRoadArrivalType === 'usualWorkPlace') &&
            (!nextVisitedPlace || nextVisitedPlace.activity !== 'workUsual')
        ) {
            addedGroupedObjectAfter = {
                sequence: visitedPlace._sequence + 1,
                path: `household.persons.${person._uuid}.journeys.${currentJourney._uuid}.visitedPlaces`,
                object: {
                    activity: 'workUsual',
                    activityCategory: 'work',
                    arrivalTime: visitedPlace.activity === 'workOnTheRoad' ? visitedPlace.departureTime : undefined
                }
            };

            // next place category is other but next is not other: insert other after:
        } else if (
            ((visitedPlace as any).nextPlaceCategory === 'visitedAnotherPlace' ||
                (visitedPlace as any).onTheRoadArrivalType === 'other') &&
            (!nextVisitedPlace ||
                nextVisitedPlace.activityCategory === 'home' ||
                (visitedPlace.activityCategory === 'work' &&
                    visitedPlace.activity === 'workOnTheRoad' &&
                    nextVisitedPlace.activity === 'workUsual'))
        ) {
            addedGroupedObjectAfter = {
                sequence: visitedPlace._sequence + 1,
                path: `household.persons.${person._uuid}.journeys.${currentJourney._uuid}.visitedPlaces`,
                object: {
                    arrivalTime: loopActivities.includes(visitedPlace.activity) ? visitedPlace.departureTime : undefined
                }
            };

            // next place category is home but next is not home: insert home after:
        } else if (
            ((visitedPlace as any).nextPlaceCategory === 'wentBackHome' ||
                (visitedPlace as any).onTheRoadArrivalType === 'home') &&
            !_isBlank(visitedPlace.activityCategory) &&
            visitedPlace.activityCategory !== 'home' &&
            (!nextVisitedPlace || nextVisitedPlace.activityCategory !== 'home')
        ) {
            addedGroupedObjectAfter = {
                sequence: visitedPlace._sequence + 1,
                path: `household.persons.${person._uuid}.journeys.${currentJourney._uuid}.visitedPlaces`,
                object: {
                    activity: 'home',
                    activityCategory: 'home',
                    arrivalTime: loopActivities.includes(visitedPlace.activity) ? visitedPlace.departureTime : undefined
                }
            };
        }

        if (addedGroupedObjectBefore && addedGroupedObjectAfter) {
            const addValuesByPathForBefore = addGroupedObjects(
                interview,
                1,
                addedGroupedObjectBefore.sequence,
                addedGroupedObjectBefore.path,
                [addedGroupedObjectBefore.object]
            ) as any;

            callbacks.startUpdateInterview(
                { sectionShortname: 'visitedPlaces', valuesByPath: addValuesByPathForBefore },
                (_interview) => {
                    const addValuesByPathForAfter = addGroupedObjects(
                        _interview,
                        1,
                        addedGroupedObjectAfter.sequence + 1,
                        addedGroupedObjectAfter.path,
                        [addedGroupedObjectAfter.object]
                    ) as any;
                    callbacks.startUpdateInterview(
                        { sectionShortname: 'visitedPlaces', valuesByPath: addValuesByPathForAfter },
                        () => {
                            callbacks.startUpdateInterview(
                                { sectionShortname: 'visitedPlaces', valuesByPath: updateValuesbyPath },
                                (_interview2) => {
                                    const _person = odSurveyHelpers.getPerson({ interview: _interview2 });
                                    const _journey = odSurveyHelpers.getActiveJourney({
                                        interview: _interview2,
                                        person: _person
                                    });
                                    const _visitedPlaces = odSurveyHelpers.getVisitedPlacesArray({ journey: _journey });
                                    const nextIncompletePlace = selectNextIncompleteVisitedPlace({
                                        visitedPlaces: _visitedPlaces,
                                        person: _person,
                                        interview: _interview2
                                    });
                                    const _updateValuesbyPath = {
                                        // we need to update twice to get changes to all vps (they may be completed in the udpate) before selecting an incomplete vp:
                                        ['response._activeVisitedPlaceId']: nextIncompletePlace
                                            ? nextIncompletePlace._uuid
                                            : null
                                    };
                                    callbacks.startUpdateInterview({
                                        sectionShortname: 'visitedPlaces',
                                        valuesByPath: _updateValuesbyPath
                                    });
                                }
                            );
                        }
                    );
                }
            );
            return null;
        } else if (addedGroupedObjectBefore) {
            const addValuesByPathForBefore = addGroupedObjects(
                interview,
                1,
                addedGroupedObjectBefore.sequence,
                addedGroupedObjectBefore.path,
                [addedGroupedObjectBefore.object]
            ) as any;
            callbacks.startUpdateInterview(
                { sectionShortname: 'visitedPlaces', valuesByPath: addValuesByPathForBefore },
                () => {
                    callbacks.startUpdateInterview(
                        { sectionShortname: 'visitedPlaces', valuesByPath: updateValuesbyPath },
                        (_interview) => {
                            const _person = odSurveyHelpers.getPerson({ interview: _interview });
                            const _journey = odSurveyHelpers.getActiveJourney({
                                interview: _interview,
                                person: _person
                            });
                            const _visitedPlaces = odSurveyHelpers.getVisitedPlacesArray({ journey: _journey });
                            const nextIncompletePlace = selectNextIncompleteVisitedPlace({
                                visitedPlaces: _visitedPlaces,
                                person: _person,
                                interview: _interview
                            });
                            const _updateValuesbyPath = {
                                // we need to update twice to get changes to all vps (they may be completed in the udpate) before selecting an incomplete vp:
                                ['response._activeVisitedPlaceId']: nextIncompletePlace
                                    ? nextIncompletePlace._uuid
                                    : null
                            };
                            callbacks.startUpdateInterview({
                                sectionShortname: 'visitedPlaces',
                                valuesByPath: _updateValuesbyPath
                            });
                        }
                    );
                }
            );
            return null;
        } else if (addedGroupedObjectAfter) {
            const addValuesByPathForAfter = addGroupedObjects(
                interview,
                1,
                addedGroupedObjectAfter.sequence,
                addedGroupedObjectAfter.path,
                [addedGroupedObjectAfter.object]
            ) as any;
            callbacks.startUpdateInterview(
                { sectionShortname: 'visitedPlaces', valuesByPath: addValuesByPathForAfter },
                () => {
                    callbacks.startUpdateInterview(
                        { sectionShortname: 'visitedPlaces', valuesByPath: updateValuesbyPath },
                        (_interview) => {
                            const _person = odSurveyHelpers.getPerson({ interview: _interview });
                            const _journey = odSurveyHelpers.getActiveJourney({
                                interview: _interview,
                                person: _person
                            });
                            const _visitedPlaces = odSurveyHelpers.getVisitedPlacesArray({ journey: _journey });
                            const nextIncompletePlace = selectNextIncompleteVisitedPlace({
                                visitedPlaces: _visitedPlaces,
                                person: _person,
                                interview: _interview
                            });
                            const _updateValuesbyPath = {
                                // we need to update twice to get changes to all vps (they may be completed in the udpate) before selecting an incomplete vp:
                                ['response._activeVisitedPlaceId']: nextIncompletePlace
                                    ? nextIncompletePlace._uuid
                                    : null
                            };
                            callbacks.startUpdateInterview({
                                sectionShortname: 'visitedPlaces',
                                valuesByPath: _updateValuesbyPath
                            });
                        }
                    );
                }
            );
            return null;
        } else {
            callbacks.startUpdateInterview(
                { sectionShortname: 'visitedPlaces', valuesByPath: updateValuesbyPath },
                (_interview) => {
                    const _person = odSurveyHelpers.getPerson({ interview: _interview });
                    const _journey = odSurveyHelpers.getActiveJourney({ interview: _interview, person: _person });
                    const _visitedPlaces = odSurveyHelpers.getVisitedPlacesArray({ journey: _journey });
                    const nextIncompletePlace = selectNextIncompleteVisitedPlace({
                        visitedPlaces: _visitedPlaces,
                        person: _person,
                        interview: _interview
                    });
                    const _updateValuesbyPath = {
                        // we need to update twice to get changes to all vps (they may be completed in the udpate) before selecting an incomplete vp:
                        ['response._activeVisitedPlaceId']: nextIncompletePlace ? nextIncompletePlace._uuid : null
                    };
                    callbacks.startUpdateInterview({
                        sectionShortname: 'visitedPlaces',
                        valuesByPath: _updateValuesbyPath
                    });
                }
            );
            return null;
        }
    },
    action: validateButtonAction
};

// FIXME This button is the same as the delete button, except the condition who here needs the blank category, while the other for the the not blank category
export const buttonCancelVisitedPlace: WidgetConfig.ButtonWidgetConfig = {
    type: 'button',
    color: 'grey',
    label: (t: TFunction) => t('main:Cancel'),
    hideWhenRefreshing: true,
    path: 'cancelVisitedPlace',
    conditional: function (interview, path) {
        const person = odSurveyHelpers.getPerson({ interview }) as any;
        const currentJourney = odSurveyHelpers.getActiveJourney({ interview, person });
        const visitedPlace = odSurveyHelpers.getActiveVisitedPlace({ interview, journey: currentJourney });
        const visitePlacesArray = odSurveyHelpers.getVisitedPlacesArray({ journey: currentJourney });

        return [visitePlacesArray.length > 1 && _isBlank(visitedPlace.activityCategory), undefined];
    },
    //icon: faCheckCircle,
    align: 'center',
    size: 'small',
    action: function (
        callbacks: WidgetConfig.InterviewUpdateCallbacks,
        interview: WidgetConfig.UserInterviewAttributes,
        path: string,
        section,
        sections,
        saveCallback
    ) {
        const visitedPlacePath = getPath(path, '../');
        deleteVisitedPlace(
            visitedPlacePath,
            interview,
            callbacks.startRemoveGroupedObjects,
            callbacks.startUpdateInterview
        );
    }
};

// FIXME Differs from cancel by the conditional and the popup
export const buttonDeleteVisitedPlace: WidgetConfig.ButtonWidgetConfig = {
    type: 'button',
    color: 'red',
    icon: faTrashAlt,
    label: (t: TFunction) => t('survey:DeleteLocation'),
    hideWhenRefreshing: true,
    path: 'deleteVisitedPlace',
    conditional: function (interview, path) {
        const person = odSurveyHelpers.getPerson({ interview }) as any;
        const currentJourney = odSurveyHelpers.getActiveJourney({ interview, person });
        const visitedPlace = odSurveyHelpers.getActiveVisitedPlace({ interview, journey: currentJourney });
        const visitePlacesArray = odSurveyHelpers.getVisitedPlacesArray({ journey: currentJourney });

        return [visitePlacesArray.length > 1 && !_isBlank(visitedPlace.activityCategory), undefined];
    },
    align: 'center',
    size: 'small',
    confirmPopup: {
        content: (t: TFunction) => t('survey:ConfirmDeleteLocation')
    },
    action: function (
        callbacks: WidgetConfig.InterviewUpdateCallbacks,
        interview: WidgetConfig.UserInterviewAttributes,
        path: string,
        section,
        sections,
        saveCallback
    ) {
        const visitedPlacePath = getPath(path, '../');
        deleteVisitedPlace(
            visitedPlacePath,
            interview,
            callbacks.startRemoveGroupedObjects,
            callbacks.startUpdateInterview
        );
    }
};

export const buttonVisitedPlacesConfirmNextSection: WidgetConfig.ButtonWidgetConfig = {
    ...buttonNextBase,
    path: 'visitedPlaces.save',
    label: (t: TFunction) => t('visitedPlaces:visitedPlaces.save'),
    conditional: (interview, path) => {
        const person = odSurveyHelpers.getPerson({ interview }) as any;
        const currentJourney = odSurveyHelpers.getActiveJourney({ interview, person });
        const visitePlacesArray = odSurveyHelpers.getVisitedPlacesArray({ journey: currentJourney });
        const lastVisitedPlace = visitePlacesArray[visitePlacesArray.length - 1];
        return !!(lastVisitedPlace && (lastVisitedPlace as any).nextPlaceCategory === 'stayedThereUntilTheNextDay');
    }
};
