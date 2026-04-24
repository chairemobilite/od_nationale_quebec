// This file was manually generated for this section
import _merge from 'lodash/merge';
import { SectionConfig } from 'evolution-common/lib/services/questionnaire/types';
import { widgetsNames } from './widgetsNames';

export const currentSectionName: string = 'visitedPlaces';
const previousSectionName: SectionConfig['previousSection'] = 'tripsIntro';
const nextSectionName: SectionConfig['nextSection'] = 'segments';

// Config for the section
// FIXME Now using the builtin config for this section. Kept to make sure there's a section available for now. Remove when https://github.com/chairemobilite/evolution/issues/1531 is fixed
export const sectionConfig: SectionConfig = {
    previousSection: previousSectionName,
    nextSection: nextSectionName,
    title: {
        fr: 'Déplacements',
        en: 'Trips'
    },
    widgets: widgetsNames,
    template: 'visitedPlaces'
};

export default sectionConfig;
