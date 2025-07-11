// This file was automatically generated by the Evolution Generator.
// The Evolution Generator is used to automate the creation of consistent, reliable code.
// Any changes made to this file will be overwritten.

import { getAndValidateSurveySections, SurveySectionsConfig } from 'evolution-common/lib/services/questionnaire/types';
import homeConfigs from './sections/home/sectionConfigs';
import householdConfigs from './sections/household/sectionConfigs';
import personsTripsConfigs from './sections/personsTrips/sectionConfigs';
import tripsSelectPersonConfigs from './sections/tripsSelectPerson/sectionConfigs';
import tripsIntroConfigs from './sections/tripsIntro/sectionConfigs';
import visitedPlacesConfigs from './sections/visitedPlaces/sectionConfigs';
import segmentsConfigs from './sections/segments/sectionConfigs';
import endConfigs from './sections/end/sectionConfigs';
import completedConfigs from './sections/completed/sectionConfigs';

// Export all the sections configs
const sectionsConfigs: SurveySectionsConfig = {
    home: homeConfigs,
    household: householdConfigs,
    personsTrips: personsTripsConfigs,
    tripsSelectPerson: tripsSelectPersonConfigs,
    tripsIntro: tripsIntroConfigs,
    visitedPlaces: visitedPlacesConfigs,
    segments: segmentsConfigs,
    end: endConfigs,
    completed: completedConfigs
};
export default getAndValidateSurveySections(sectionsConfigs);
