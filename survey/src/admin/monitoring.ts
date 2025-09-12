import knex from 'chaire-lib-backend/lib/config/shared/db.config';

import adminViewQueries from 'evolution-backend/lib/models/adminViews.db.queries';
import { _booleish, _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import { validateAccessCode } from 'evolution-backend/lib/services/accessCode';
// import convertUnixTimestampToDate from '../survey/helperFunctions/convertUnixTimestampToDate';

const monitoringViewName = 'monitoring_view';
const sectionCompletionView = 'section_completion_view';

const monitoringQuery = `WITH interview_data AS (
  SELECT 
    id,
    uuid,
    participant_id,
    is_valid,
    is_completed,
    CASE
      WHEN response IS NOT NULL THEN corrected_response
      ELSE responses
    END AS effective_responses
  FROM sv_interviews
)
select iAgg.*,
i.uuid,
i.participant_id,
i.is_valid,
i.is_completed,
effective_responses->>'accessCode' as accessCode,
effective_responses->>'acceptToBeContactedForHelp' as acceptToBeContacted,
effective_responses->>'contactEmail' as contactEmail,
effective_responses->>'homePhoneNumber' as homePhoneNumber,
(effective_responses->>'_startedAt')::numeric as started_at,
(effective_responses->>'_completedAt')::numeric as completed_at,
case when effective_responses->>'_completedAt' is null then 0 else 1 end survey_completed,
case when effective_responses->>'_completedAt' is not null then (effective_responses->>'_completedAt')::numeric - (effective_responses->>'_startedAt')::numeric else null end as durationSeconds,
effective_responses->>'_language' as str_language,
effective_responses->>'assignedDay' as assignedDay,
to_char(to_date(effective_responses->>'assignedDay', 'YYYY-MM-DD'), 'ID') as assignedWeekDayIso,
to_char(to_date(effective_responses->>'assignedDay', 'YYYY-MM-DD'), 'Day') as assignedWeekDay,
effective_responses->'household'->>'size' as household_size,
CASE
  WHEN part.google_id is not null THEN 'google'
  WHEN part.email is null THEN 'anon'
  else 'email'
END AS authMethod,
effective_responses->'household'->>'commentsOnSurvey' as comments,
intvw.interviewer_names
from interview_data i 
inner join (
select id, count(pid) as cntP, sum(didTripsRens) as pMobileRens, sum(didTrips) as pMobile, sum(noTrips) as pNoMobile, sum(cntTrips) as nb_trips_total, case when sum(didTrips) > 0 then sum(cntTrips) / sum(didTrips) else 0 end as tripsPerPerson from (
    select id, pid, age,
        case when didTrips = 'yes' or didTrips = 'true' then 1 else 0 end as didTrips,
        case when didTrips = 'no' or didTrips = 'false' then 1 else 0 end as noTrips,
        case when didTrips is not null then 1 else 0 end as didTripsRens,
        cntTrips from (
            select id, pid, age, didTrips, count(tid) as cntTrips 
            from (
                select id, pid, (pjson->>'age')::numeric as age, pjson->>'personDidTrips' as didTrips, t.key as tid, t.value::json as tjson from (
                    select i.id, p.key as pid, (p.value::json->>'trips')::json as trips, p.value::json as pjson
                        from interview_data i
                        left join json_each_text(effective_responses->'household'->'persons') p on true
                    ) p
                left join json_each_text(trips) t on true
            ) tblTrips
            group by id, pid, age, didTrips
        ) tblPersons
    )tbl2
group by id
) iAgg on i.id = iAgg.id
inner join sv_participants part on i.participant_id = part.id
left join (
    select svi.id, string_agg(u.email, ',') as interviewer_names
    from sv_interviews as svi
    inner join sv_interviews_accesses as a on a.interview_id = svi.id
    inner join users as u on a.user_id = u.id
    where a.for_validation is not true
    group by svi.id
) intvw on i.id = intvw.id`;

// FIXME Should we use effective_response like above here too? Or just the participant's own data?
const sectionCompletionQuery = `select i.id, s.key as section_name, (s.value::json->>'_startedAt') as started_at, case when (s.value::json->>'_isCompleted')::boolean is not true then false else true end as is_completed
from sv_interviews i
left join json_each_text(responses->'_sections') s on true
where s.key = 'home' or s.key = 'householdMembers' or s.key = 'end'`;

export const setupMonitoringView = async () => {
    try {
        await adminViewQueries.registerView(sectionCompletionView, sectionCompletionQuery, ['id', 'section_name']);
        console.log('Section completion view successfully registered');
        await adminViewQueries.registerView(monitoringViewName, monitoringQuery, 'id');
        console.log('Monitoring view successfully registered');
    } catch (error) {
        console.error('Error creating monitoring views', error);
    }
};

export const refreshMonitoringCache = async () => adminViewQueries.refreshAllViews();

// Tracking data export
export const trackingData = async () => {
    const innerQuery = knex(sectionCompletionView)
        .select(
            'id',
            knex.raw('case when section_name = \'home\' and started_at is not null then 1 else 0 end as home_started'),
            knex.raw('case when section_name = \'home\' and is_completed is true then 1 else 0 end as home_completed'),
            knex.raw(
                'case when section_name = \'householdMembers\' and started_at is not null then 1 else 0 end as hh_started'
            ),
            knex.raw(
                'case when section_name = \'householdMembers\' and is_completed is true then 1 else 0 end as hh_completed'
            ),
            knex.raw('case when section_name = \'end\' and started_at is not null then 1 else 0 end as end_started')
        )
        .as('all_sections');
    const groupBySections = knex(innerQuery)
        .select(
            'id',
            knex.raw('sum(home_started) as home_started'),
            knex.raw('sum(home_completed) as home_completed'),
            knex.raw('sum(hh_started) as hh_started'),
            knex.raw('sum(hh_completed) as hh_completed'),
            knex.raw('sum(end_started) as end_started')
        )
        .groupBy('id')
        .as('section_completed');
    const query = knex(monitoringViewName)
        .leftJoin(groupBySections, `${monitoringViewName}.id`, 'section_completed.id')
        .select('*');
    const results = await query;
    return results.map((res) => ({
        id: res.id,
        uuid: res.uuid,
        accessCode: res.accesscode,
        loginMethod: res.authmethod,
        acceptToBeContacted: !_isBlank(res.accepttobecontacted)
            ? _booleish(res.accepttobecontacted)
                ? 1
                : 0
            : res.accepttobecontacted,
        contactEmailProvided: !_isBlank(res.contactemail) ? 1 : 0,
        // startedAt: convertUnixTimestampToDate(res.started_at),
        // completedAt: convertUnixTimestampToDate(res.completed_at),
        isCompleted: res.survey_completed,
        durationMinutes: !_isBlank(res.durationseconds) ? Math.ceil(res.durationseconds / 60) : '',
        language: res.str_language,
        tripsDayOfWeek: res.assignedweekdayiso,
        tripsDayOfWeekName: res.assignedweekday,
        tripsDate: res.assignedday,
        hasValidAccessCode: !_isBlank(res.accesscode) ? (validateAccessCode(res.accesscode) ? 1 : 0) : '',
        householdSize: res.household_size,
        tripsCount: res.nb_trips_total,
        section1HomeCompleted: res.home_completed,
        section2HouseholdMemberCompleted: res.hh_completed,
        section3TripsCompleted: res.end_started,
        section4EndCompleted: res.survey_completed ? 1 : 0,
        interviewers: res.interviewer_names
    }));
};
