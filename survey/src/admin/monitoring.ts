import moment from 'moment-timezone';
import knex from 'chaire-lib-backend/lib/config/shared/db.config';
import adminViewQueries from 'evolution-backend/lib/models/adminViews.db.queries';
import { _booleish, _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import { validateAccessCode } from 'evolution-backend/lib/services/accessCode';

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
      WHEN corrected_response IS NOT NULL THEN corrected_response
      ELSE response
    END AS effective_response
  FROM sv_interviews
)
select iAgg.*,
i.uuid,
i.participant_id,
i.is_valid,
i.is_completed,
effective_response->>'accessCode' as accessCode,
effective_response->>'acceptToBeContactedForHelp' as acceptToBeContacted,
effective_response->>'contactEmail' as contactEmail,
effective_response->>'homePhoneNumber' as homePhoneNumber,
effective_response->'home'->'preData'->>'strate' as strate,
effective_response->'home'->'preData'->>'lot' as lot,
(effective_response->>'_startedAt')::numeric as started_at,
(effective_response->>'_completedAt')::numeric as completed_at,
case when effective_response->>'_completedAt' is null then 0 else 1 end survey_completed,
case when effective_response->>'_completedAt' is not null then (effective_response->>'_completedAt')::numeric - (effective_response->>'_startedAt')::numeric else null end as durationSeconds,
effective_response->>'_language' as str_language,
effective_response->>'_assignedDay' as assignedDay,
to_char(to_date(effective_response->>'_assignedDay', 'YYYY-MM-DD'), 'ID') as assignedWeekDayIso,
to_char(to_date(effective_response->>'_assignedDay', 'YYYY-MM-DD'), 'Day') as assignedWeekDay,
effective_response->'household'->>'size' as household_size,
effective_response->'household'->>'commentsOnSurvey' as comments,
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
                select id, pid, jid, (pjson->>'age')::numeric as age, jjson->>'personDidTrips' as didTrips, t.key as tid, t.value::json as tjson from (
					select id, p.pid, j.key as jid, pjson, (j.value::json->>'trips')::json as trips, j.value::json as jjson from (
	                    select i.id, p.key as pid, (p.value::json->>'journeys')::json as journeys, p.value::json as pjson
	                        from interview_data i
	                        left join json_each_text(effective_response->'household'->'persons') p on true
	                    ) p
						left join json_each_text(journeys) j on true
					) j
                left join json_each_text(trips) t on true
            ) tblTrips
            group by id, pid, age, didTrips
        ) tblPersons
    )tbl2
group by id
) iAgg on i.id = iAgg.id
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
left join json_each_text(response->'_sections') s on true
where s.key = 'home' or s.key = 'household' or s.key = 'end'`;

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

// Convert a Unix timestamp to ("yyyy-mm-dd")
export default function convertUnixTimestampToDate(timestamp: number): string | null {
    if (timestamp !== null) {
        const momentDate = moment.unix(timestamp).tz('America/Montreal');
        const formattedDate = momentDate.format('YYYY-MM-DD');
        return formattedDate;
    } else {
        return null;
    }
}

// Tracking data export
export const trackingData = async () => {
    try {
        const innerQuery = knex(sectionCompletionView)
            .select(
                'id',
                knex.raw(
                    'case when section_name = \'home\' and started_at is not null then 1 else 0 end as home_started'
                ),
                knex.raw(
                    'case when section_name = \'home\' and is_completed is true then 1 else 0 end as home_completed'
                ),
                knex.raw(
                    'case when section_name = \'household\' and started_at is not null then 1 else 0 end as hh_started'
                ),
                knex.raw(
                    'case when section_name = \'household\' and is_completed is true then 1 else 0 end as hh_completed'
                ),
                knex.raw('case when section_name = \'end\' and started_at is not null then 1 else 0 end as end_started')
            )
            .as('all_sections');
        const groupBySections = knex(innerQuery)
            .select(
                'id as id_with_sections',
                knex.raw('sum(home_started) as home_started'),
                knex.raw('sum(home_completed) as home_completed'),
                knex.raw('sum(hh_started) as hh_started'),
                knex.raw('sum(hh_completed) as hh_completed'),
                knex.raw('sum(end_started) as end_started')
            )
            .groupBy('id')
            .as('section_completed');
        const query = knex(monitoringViewName)
            .leftJoin(groupBySections, `${monitoringViewName}.id`, 'section_completed.id_with_sections')
            .select('*')
            .orderBy('started_at', 'asc');
        const results = await query;
        return results.map((res) => ({
            id: res.id,
            uuid: res.uuid,
            accessCode: res.accesscode,
            // loginMethod: res.authmethod, // Note: The login method is the same for all since we only have one
            acceptToBeContacted: !_isBlank(res.accepttobecontacted)
                ? _booleish(res.accepttobecontacted)
                    ? 1
                    : 0
                : res.accepttobecontacted,
            contactEmailProvided: !_isBlank(res.contactemail) ? 1 : 0,
            strate: res.strate,
            lot: res.lot,
            startedAt: convertUnixTimestampToDate(res.started_at),
            completedAt: convertUnixTimestampToDate(res.completed_at),
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
            section2HouseholdCompleted: res.hh_completed,
            section3TripsCompleted: res.end_started,
            section4EndCompleted: res.survey_completed ? 1 : 0,
            // TODO: We should add all the sections here
            interviewers: res.interviewer_names
        }));
    } catch (error) {
        console.error('Error in trackingData:', error);
        return [];
    }
};
