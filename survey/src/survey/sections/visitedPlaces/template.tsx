/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import _get from 'lodash/get';
import { useNavigate, useLocation } from 'react-router';
import _cloneDeep from 'lodash/cloneDeep';
import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrashAlt } from '@fortawesome/free-solid-svg-icons/faTrashAlt';
import { faPencilAlt } from '@fortawesome/free-solid-svg-icons/faPencilAlt';
import { faPlusCircle } from '@fortawesome/free-solid-svg-icons/faPlusCircle';
import { faClock } from '@fortawesome/free-solid-svg-icons/faClock';
import { faArrowRight } from '@fortawesome/free-solid-svg-icons/faArrowRight';

import { GroupedObject } from 'evolution-frontend/lib/components/survey/GroupWidgets';
import { Widget } from 'evolution-frontend/lib/components/survey/Widget';
import * as surveyHelper from 'evolution-common/lib/utils/helpers';
import * as odSurveyHelper from 'evolution-common/lib/services/odSurvey/helpers';
import { roundToDecimals } from 'chaire-lib-common/lib/utils/MathUtils';
import * as customHelpers from '../../common/helper';
import ConfirmModal from 'chaire-lib-frontend/lib/components/modal/ConfirmModal';
import LoadingPage from 'chaire-lib-frontend/lib/components/pages/LoadingPage';
import { SectionProps, useSectionTemplate } from 'evolution-frontend/lib/components/hooks/useSectionTemplate';
import { SurveyContext } from 'evolution-frontend/lib/contexts/SurveyContext';
import {
    getVisitedPlaceDescription,
    secondsSinceMidnightToTimeStrWithSuffix
} from 'evolution-frontend/lib/services/display/frontendHelper';
import { selectNextIncompleteVisitedPlace } from '../../common/helper';
import { GroupConfig } from 'evolution-common/lib/services/questionnaire/types';
import { getResponse } from 'evolution-common/lib/utils/helpers';

const percentLengthOfOneSecond = 100.0 / (28 * 3600);

export const VisitedPlacesSection: React.FC<SectionProps> = (props: SectionProps) => {
    const { preloaded } = useSectionTemplate(props);
    const [confirmDeleteVisitedPlace, setConfirmDeleteVisitedPlace] = React.useState<string | null>(null);
    const navigate = useNavigate();
    const location = useLocation();
    const surveyContext = React.useContext(SurveyContext);
    const { t, i18n } = useTranslation('survey');

    const addVisitedPlace = (sequence, path, e) => {
        if (e) {
            e.preventDefault();
        }
        // Add a new place at sequence
        props.startAddGroupedObjects(1, sequence, path, [], (interview) => {
            const person = odSurveyHelper.getPerson({ interview }) as any;
            const currentJourney = odSurveyHelper.getActiveJourney({ interview });
            const visitedPlaces = odSurveyHelper.getVisitedPlacesArray({ journey: currentJourney });
            // Get the inserted visited place, if sequence is -1, get the last one
            const insertedVisitedPlace =
                sequence === -1
                    ? visitedPlaces[visitedPlaces.length - 1]
                    : visitedPlaces.find((visitedPlace) => visitedPlace._sequence === sequence);
            const insertedVisitedPlacePath = `household.persons.${person._uuid}.journeys.${currentJourney._uuid}.visitedPlaces.${insertedVisitedPlace._uuid}`;
            const previousVisitedPlace = odSurveyHelper.getPreviousVisitedPlace({
                journey: currentJourney,
                visitedPlaceId: insertedVisitedPlace._uuid
            });
            const nextVisitedPlace = odSurveyHelper.getNextVisitedPlace({
                journey: currentJourney,
                visitedPlaceId: insertedVisitedPlace._uuid
            });

            const updateValuesByPath = {};
            //we must change from previous place `nextPlaceCategory`
            // `nextPlaceCategory` can be null excepte for last visitedPlace
            // we can't assigne last visitedPlace `nextPlaceCategory` here since we don't know yet what type of place user want to add (home, work, other).
            if (previousVisitedPlace && sequence > 1) {
                const previousVisitedPlacePath = `household.persons.${person._uuid}.journeys.${currentJourney._uuid}.visitedPlaces.${previousVisitedPlace._uuid}`;
                updateValuesByPath[`response.${previousVisitedPlacePath}.nextPlaceCategory`] = null;
                // FIXME, copy-pasted, but _previousDepartureTime is a boolean?
                updateValuesByPath[`response.${insertedVisitedPlacePath}._previousDepartureTime`] =
                    sequence === previousVisitedPlace.departureTime;
            }
            //we must change _previousDepartureTime for nextVisitedPlace and set it to null
            if (nextVisitedPlace && sequence > 1) {
                const nextVisitedPlacePath = `household.persons.${person._uuid}.journeys.${currentJourney._uuid}.visitedPlaces.${nextVisitedPlace._uuid}`;
                updateValuesByPath[`response.${nextVisitedPlacePath}._previousDepartureTime`] = null;
            }
            //we set added visited place as active place
            const firstIncompleteVisitedPlace = selectNextIncompleteVisitedPlace({ visitedPlaces, person, interview });
            updateValuesByPath['response._activeVisitedPlaceId'] = insertedVisitedPlace
                ? insertedVisitedPlace._uuid
                : firstIncompleteVisitedPlace !== null
                    ? firstIncompleteVisitedPlace._uuid
                    : null;
            props.startUpdateInterview({ sectionShortname: 'visitedPlaces', valuesByPath: updateValuesByPath });
        });
    };

    const selectVisitedPlace = (visitedPlaceUuid, e) => {
        if (e) {
            e.preventDefault();
        }
        props.startUpdateInterview({
            sectionShortname: 'visitedPlaces',
            valuesByPath: { ['response._activeVisitedPlaceId']: visitedPlaceUuid }
        });
    };

    const deleteVisitedPlace = (person, visitedPlacePath, visitedPlace, visitedPlaces, e = undefined) => {
        if (e) {
            e.preventDefault();
        }
        customHelpers.deleteVisitedPlace(
            visitedPlacePath,
            props.interview,
            props.startRemoveGroupedObjects,
            props.startUpdateInterview
        );
    };

    if (!preloaded) {
        return <LoadingPage />;
    }

    // Prepare required data
    surveyHelper.devLog('%c rendering section ' + props.shortname, 'background: rgba(0,0,255,0.1);');
    const widgetsComponentsByShortname = {};
    const personVisitedPlacesConfig = surveyContext.widgets['personVisitedPlaces'] as GroupConfig;
    const person = odSurveyHelper.getPerson({ interview: props.interview });
    const currentJourney = odSurveyHelper.getActiveJourney({ interview: props.interview, person });
    const interviewablePersons = odSurveyHelper.getInterviewablePersonsArray({ interview: props.interview });
    const isAlone = interviewablePersons.length === 1;

    // setup schedules for all interviewable persons:
    // FIXME Extract to a function component, the for loop has a lot of variables in common with the main block

    const widgetsSchedules = [];

    let activePersonSchedule = null;
    const selectedVisitedPlaceId = odSurveyHelper.getActiveVisitedPlace({
        interview: props.interview,
        journey: currentJourney
    })?._uuid;
    for (let i = 0; i < interviewablePersons.length; i++) {
        const personForSchedule = interviewablePersons[i];
        const isPersonActive = personForSchedule._uuid === person._uuid;
        let atLeastOneCompletedVisitedPlace = false;
        const journeysForSchedule = odSurveyHelper.getJourneysArray({ person: personForSchedule });
        const journeyForSchedule = journeysForSchedule[0];
        const visitedPlacesForSchedule =
            journeyForSchedule !== undefined
                ? odSurveyHelper.getVisitedPlacesArray({ journey: journeyForSchedule })
                : [];
        const personVisitedPlacesSchedules = [];
        for (let i = 0, count = visitedPlacesForSchedule.length; i < count; i++) {
            const visitedPlace = visitedPlacesForSchedule[i];
            const visitedPlaceDescription = getVisitedPlaceDescription(visitedPlace, true, false);
            let departureTime = i === count - 1 ? 28 * 3600 : null;
            let arrivalTime = i === 0 ? 0 : null;
            if (visitedPlace.departureTime) {
                departureTime = visitedPlace.departureTime;
            }
            if (visitedPlace.arrivalTime) {
                arrivalTime = visitedPlace.arrivalTime;
            }
            if (visitedPlace.activityCategory && !_isBlank(departureTime) && !_isBlank(arrivalTime)) {
                atLeastOneCompletedVisitedPlace = true;
            } else {
                continue;
            }
            const startAtPercent = roundToDecimals(arrivalTime * percentLengthOfOneSecond, 4);
            const width = roundToDecimals(departureTime * percentLengthOfOneSecond - startAtPercent, 4);
            const visitedPlaceSchedule = (
                <div
                    className={`survey-visited-places-schedule-visited-place${isPersonActive && !selectedVisitedPlaceId ? ' hand-cursor-on-hover' : ''}`}
                    key={visitedPlace._uuid}
                    style={{ left: startAtPercent.toString() + '%', width: width.toString() + '%' }}
                    title={visitedPlaceDescription}
                    onClick={
                        props.interview.allWidgetsValid && isPersonActive && !selectedVisitedPlaceId
                            ? (e) => selectVisitedPlace(visitedPlace._uuid, e)
                            : null
                    }
                >
                    <div className="survey-visited-places-schedule-visited-place-icon">
                        <img
                            src={`/dist/images/activities_icons/${visitedPlace.activity}_plain.svg`}
                            style={{ height: '2em' }}
                            alt={
                                visitedPlace.activity
                                    ? t(`survey:visitedPlace:activities:${visitedPlace.activity}`)
                                    : ''
                            }
                        />
                        <p>
                            <FontAwesomeIcon icon={faClock} style={{ marginRight: '0.3rem', marginLeft: '0.6rem' }} />
                            {visitedPlace.arrivalTime &&
                                secondsSinceMidnightToTimeStrWithSuffix(visitedPlace.arrivalTime, t('main:theNextDay'))}
                            {visitedPlace.departureTime && (
                                <FontAwesomeIcon
                                    icon={faArrowRight}
                                    style={{ marginRight: '0.3rem', marginLeft: '0.3rem' }}
                                />
                            )}
                            {visitedPlace.departureTime &&
                                secondsSinceMidnightToTimeStrWithSuffix(
                                    visitedPlace.departureTime,
                                    t('main:theNextDay')
                                )}
                        </p>
                    </div>
                </div>
            );
            personVisitedPlacesSchedules.push(visitedPlaceSchedule);
        }
        if (atLeastOneCompletedVisitedPlace) {
            const personSchedule = (
                <div className="survey-visited-places-schedule-person-container" key={personForSchedule._uuid}>
                    {
                        <p className={personForSchedule._uuid === person._uuid ? ' _orange' : ''}>
                            {t('survey:person:dayScheduleFor', {
                                nickname: personForSchedule.nickname,
                                count: interviewablePersons.length
                            })}
                        </p>
                    }
                    <div className="survey-visited-places-schedule-person">{personVisitedPlacesSchedules}</div>
                </div>
            );
            if (isPersonActive) {
                activePersonSchedule = personSchedule;
            } else {
                widgetsSchedules.push(personSchedule);
            }
        }
    }
    if (activePersonSchedule) {
        widgetsSchedules.push(activePersonSchedule);
    }

    // setup widgets:

    for (let i = 0, count = props.sectionConfig.widgets.length; i < count; i++) {
        const widgetShortname = props.sectionConfig.widgets[i];

        widgetsComponentsByShortname[widgetShortname] = (
            <Widget
                key={widgetShortname}
                currentWidgetShortname={widgetShortname}
                nextWidgetShortname={props.sectionConfig.widgets[i + 1]}
                sectionName={props.shortname}
                interview={props.interview}
                errors={props.errors}
                user={props.user}
                loadingState={props.loadingState}
                startUpdateInterview={props.startUpdateInterview}
                startAddGroupedObjects={props.startAddGroupedObjects}
                startRemoveGroupedObjects={props.startRemoveGroupedObjects}
                startNavigate={props.startNavigate}
            />
        );
    }

    // setup visited places:

    const visitedPlaces = odSurveyHelper.getVisitedPlacesArray({ journey: currentJourney });
    const lastVisitedPlace = visitedPlaces.length > 0 ? visitedPlaces[visitedPlaces.length - 1] : null;
    const visitedPlacesList = [];

    for (let i = 0, count = visitedPlaces.length; i < count; i++) {
        const visitedPlace = visitedPlaces[i] as any;
        const isPlaceSelected = selectedVisitedPlaceId && visitedPlace._uuid === selectedVisitedPlaceId;
        const activity = visitedPlace.activity;
        const actualVisitedPlace = visitedPlace.shortcut
            ? getResponse(props.interview, visitedPlace.shortcut, visitedPlace)
            : visitedPlace;
        const visitedPlacePath = `household.persons.${person._uuid}.journeys.${currentJourney._uuid}.visitedPlaces.${visitedPlace._uuid}`;
        const visitedPlaceItem = (
            <li
                className={`no-bullet survey-visited-place-item${isPlaceSelected ? ' survey-visited-place-item-selected' : ''}`}
                key={`survey-visited-place-item__${i}`}
            >
                <span className="survey-visited-place-item-element survey-visited-place-item-sequence-and-icon">
                    {visitedPlace._sequence}.{' '}
                    {activity && (
                        <img
                            src={`/dist/images/activities_icons/${activity}_marker.svg`}
                            style={{ height: '4rem' }}
                            alt={activity ? t(`survey:visitedPlace:activities:${activity}`) : ''}
                        />
                    )}
                </span>
                <span className="survey-visited-place-item-element survey-visited-place-item-description text-box-ellipsis">
                    <span className={isPlaceSelected ? '_strong' : ''}>
                        {activity && t(`survey:visitedPlace:activities:${activity}`)}
                        {actualVisitedPlace.name && <em>&nbsp;• {actualVisitedPlace.name}</em>}
                    </span>
                </span>

                {
                    <span className="survey-visited-place-item-element survey-visited-place-item-buttons">
                        <FontAwesomeIcon icon={faClock} style={{ marginRight: '0.3rem', marginLeft: '0.6rem' }} />
                        {visitedPlace.arrivalTime &&
                            secondsSinceMidnightToTimeStrWithSuffix(visitedPlace.arrivalTime, t('main:theNextDay'))}
                        {visitedPlace.departureTime && (
                            <FontAwesomeIcon
                                icon={faArrowRight}
                                style={{ marginRight: '0.3rem', marginLeft: '0.3rem' }}
                            />
                        )}
                        {visitedPlace.departureTime &&
                            secondsSinceMidnightToTimeStrWithSuffix(visitedPlace.departureTime, t('main:theNextDay'))}
                        {!selectedVisitedPlaceId /*state.editActivated*/ && props.loadingState === 0 && (
                            <button
                                type="button"
                                className={'survey-section__button button blue small'}
                                onClick={(e) => selectVisitedPlace(visitedPlace._uuid, e)}
                                style={{ marginLeft: '0.5rem' }}
                                title={t('survey:visitedPlace:editVisitedPlace')}
                            >
                                <FontAwesomeIcon icon={faPencilAlt} className="" />
                                {/*props.t('survey:visitedPlace:editVisitedPlace')*/}
                            </button>
                        )}
                        {!selectedVisitedPlaceId /*state.editActivated*/ &&
                            props.loadingState === 0 &&
                            visitedPlaces.length > 1 && (
                            <button
                                type="button"
                                className={'survey-section__button button red small'}
                                onClick={(e) => setConfirmDeleteVisitedPlace(visitedPlacePath)}
                                title={t('survey:visitedPlace:deleteVisitedPlace')}
                            >
                                <FontAwesomeIcon icon={faTrashAlt} className="" />
                                {/*props.t('survey:visitedPlace:deleteVisitedPlace')*/}
                            </button>
                        )}
                        {/* FIXME In od_nationale_2024, there is an extra widget dependent on the validating user to merge places */}
                        {/* confirmPopup below: */}
                        {confirmDeleteVisitedPlace === visitedPlacePath && (
                            <div>
                                <ConfirmModal
                                    isOpen={true}
                                    closeModal={() => setConfirmDeleteVisitedPlace(null)}
                                    text={surveyHelper.translateString(
                                        personVisitedPlacesConfig.deleteConfirmPopup.content,
                                        i18n,
                                        props.interview,
                                        props.shortname
                                    )}
                                    title={
                                        personVisitedPlacesConfig.deleteConfirmPopup.title
                                            ? surveyHelper.translateString(
                                                personVisitedPlacesConfig.deleteConfirmPopup.title,
                                                i18n,
                                                props.interview,
                                                props.shortname
                                            )
                                            : null
                                    }
                                    cancelAction={null}
                                    confirmAction={(e) =>
                                        deleteVisitedPlace(person, visitedPlacePath, visitedPlace, visitedPlaces, e)
                                    }
                                    containsHtml={personVisitedPlacesConfig.deleteConfirmPopup.containsHtml}
                                />
                            </div>
                        )}
                    </span>
                }
            </li>
        );

        visitedPlacesList.push(visitedPlaceItem);

        if (selectedVisitedPlaceId && isPlaceSelected) {
            const parentObjectIds = {};
            parentObjectIds['personVisitedPlaces'] = visitedPlace._uuid;
            const selectedVisitedPlaceComponent = (
                <li
                    className="no-bullet"
                    style={{ marginTop: '-0.4rem' }}
                    key={`survey-visited-place-item-selected__${i}`}
                >
                    <GroupedObject
                        widgetConfig={personVisitedPlacesConfig}
                        shortname="personVisitedPlaces"
                        path={visitedPlacePath}
                        loadingState={props.loadingState}
                        objectId={visitedPlace._uuid}
                        parentObjectIds={parentObjectIds}
                        key={`survey-visited-place-item-selected-${visitedPlace._uuid}`}
                        sequence={visitedPlace['_sequence']}
                        section={'visitedPlaces'}
                        interview={props.interview}
                        user={props.user}
                        errors={props.errors}
                        startUpdateInterview={props.startUpdateInterview}
                        startAddGroupedObjects={props.startAddGroupedObjects}
                        startRemoveGroupedObjects={props.startRemoveGroupedObjects}
                        startNavigate={props.startNavigate}
                    />
                </li>
            );
            visitedPlacesList.push(selectedVisitedPlaceComponent);
        }

        if (
            !selectedVisitedPlaceId &&
            props.loadingState === 0 &&
            visitedPlaces.length > 1 &&
            ((lastVisitedPlace && lastVisitedPlace._uuid !== visitedPlace._uuid) ||
                (lastVisitedPlace._uuid === visitedPlace._uuid &&
                    visitedPlace.nextPlaceCategory === 'stayedThereUntilTheNextDay'))
        ) {
            visitedPlacesList.push(
                <li
                    className="no-bullet survey-visited-place-insert"
                    key={`survey-visited-place-item-insert-after__${i}`}
                    style={{ marginTop: '-0.4em', marginLeft: '2rem', padding: 0 }}
                >
                    <button
                        type="button"
                        className="button blue center small"
                        onClick={(e) =>
                            addVisitedPlace(
                                visitedPlace['_sequence'] + 1,
                                `household.persons.${person._uuid}.journeys.${currentJourney._uuid}.visitedPlaces`,
                                e
                            )
                        }
                        title={t('survey:visitedPlace:insertVisitedPlace')}
                    >
                        <FontAwesomeIcon icon={faPlusCircle} className="faIconLeft" />
                        {t('survey:visitedPlace:insertVisitedPlace')}
                    </button>
                </li>
            );
        }
    }
    return (
        <section className={`survey-section survey-section-shortname-${props.shortname}`}>
            <div className="survey-section__content">
                {widgetsComponentsByShortname['activePersonTitle']}
                {widgetsComponentsByShortname['buttonSwitchPerson']}
                <div className="survey-visited-places-schedules">{widgetsSchedules}</div>
                <div className="survey-visited-places-list-and-map-container">
                    <ul
                        className={`survey-visited-places-list ${selectedVisitedPlaceId || visitedPlaces.length <= 1 ? 'full-width' : ''}`}
                    >
                        {widgetsComponentsByShortname['personVisitedPlacesTitle']}
                        {visitedPlacesList}
                        {!selectedVisitedPlaceId &&
                            ((lastVisitedPlace &&
                                (lastVisitedPlace as any).nextPlaceCategory !== 'stayedThereUntilTheNextDay') ||
                                visitedPlaces.length === 1) &&
                            props.loadingState === 0 && (
                            <button
                                type="button"
                                className="button blue center large"
                                onClick={(e) =>
                                    addVisitedPlace(
                                        -1,
                                        `household.persons.${person._uuid}.journeys.${currentJourney._uuid}.visitedPlaces`,
                                        e
                                    )
                                }
                                title={t('survey:visitedPlace:addVisitedPlace')}
                            >
                                <FontAwesomeIcon icon={faPlusCircle} className="faIconLeft" />
                                {t('survey:visitedPlace:addVisitedPlace')}
                            </button>
                        )}
                    </ul>
                    {!selectedVisitedPlaceId && visitedPlaces.length > 1 && (
                        <div className={'survey-visited-places-map'}>
                            {widgetsComponentsByShortname['personVisitedPlacesMap']}
                        </div>
                    )}
                </div>
                {/* This confirm button is placed here to ensure it is visible on mobile devices after the map */}
                {visitedPlaces.length > 1 &&
                    !selectedVisitedPlaceId &&
                    widgetsComponentsByShortname['buttonVisitedPlacesConfirmNextSection']}
            </div>
        </section>
    );
};

export default VisitedPlacesSection;
