// This file was automatically generated by the Evolution Generator.
// The Evolution Generator is used to automate the creation of consistent, reliable code.
// Any changes made to this file will be overwritten.

import { type ChoiceType } from 'evolution-common/lib/services/questionnaire/types';
import * as conditionals from './conditionals';
// import * as customConditionals from './customConditionals';

export const yes: ChoiceType[] = [
    {
        value: 'yes',
        label: {
            fr: 'Oui',
            en: 'Yes'
        }
    }
];

export const no: ChoiceType[] = [
    {
        value: 'no',
        label: {
            fr: 'Non',
            en: 'No'
        }
    }
];

export const other: ChoiceType[] = [
    {
        value: 'other',
        label: {
            fr: 'Autre (spécifiez)',
            en: 'Other (specify)'
        }
    }
];

export const otherWithoutSpecify: ChoiceType[] = [
    {
        value: 'other',
        label: {
            fr: 'Autre',
            en: 'Other'
        }
    }
];

export const dontKnow: ChoiceType[] = [
    {
        value: 'dontKnow',
        label: {
            fr: 'Je ne sais pas',
            en: 'I don\'t know'
        }
    }
];

export const preferNotAnswer: ChoiceType[] = [
    {
        value: 'preferNotAnswer',
        label: {
            fr: 'Je préfère ne pas répondre',
            en: 'I prefer not to answer'
        }
    }
];

export const yesNo: ChoiceType[] = [...yes, ...no];

export const yesNoDontKnow: ChoiceType[] = [...yesNo, ...dontKnow];

export const yesNoPreferNotAnswer: ChoiceType[] = [...yes, ...no, ...preferNotAnswer];

export const gender: ChoiceType[] = [
    {
        value: 'male',
        label: {
            fr: 'Homme',
            en: 'Man'
        }
    },
    {
        value: 'female',
        label: {
            fr: 'Femme',
            en: 'Woman'
        }
    },
    ...preferNotAnswer
];

export const participationStatus: ChoiceType[] = [
    {
        value: 'yesFullTime',
        label: {
            fr: 'Oui, à temps plein',
            en: 'Yes, full time'
        }
    },
    {
        value: 'yesPartTime',
        label: {
            fr: 'Oui, à temps partiel',
            en: 'Yes, part time'
        }
    },
    ...no
];

export const schoolType: ChoiceType[] = [
    {
        value: 'kindergarten',
        label: {
            fr: 'Garderie/CPE',
            en: 'Kindergarten/Childcare/CPE'
        },
        conditional: conditionals.ifAge5OrLessConditional
    },
    {
        value: 'primarySchool',
        label: {
            fr: 'École primaire',
            en: 'Primary school'
        },
        conditional: conditionals.ifAge4to13Conditional
    },
    {
        value: 'secondarySchool',
        label: {
            fr: 'École secondaire',
            en: 'Secondary school'
        },
        conditional: conditionals.ifAge11OrMoreConditional
    },
    {
        value: 'schoolAtHome',
        label: {
            fr: 'École à la maison',
            en: 'School at home'
        }
    },
    {
        value: 'collegeCegepDepAep',
        label: {
            fr: 'CEGEP / Collège / DEP / AEP',
            en: 'CEGEP / College / DEP / AEP'
        },
        conditional: conditionals.ifAge15OrMoreConditional
    },
    ...other
];

export const personOccupation: ChoiceType[] = [
    {
        value: 'fullTimeWorker',
        label: {
            fr: 'Travail à temps plein (30h et plus/semaine)',
            en: 'Employed full-time (30h and more/week)'
        }
    },
    {
        value: 'partTimeWorker',
        label: {
            fr: 'Travail à temps partiel (moins de 30h/semaine)',
            en: 'Employed part-time (less than 30h/week)'
        }
    },
    {
        value: 'workerAndStudent',
        label: {
            fr: 'Travail et études',
            en: 'Work and studies'
        }
    },
    {
        value: 'fullTimeStudent',
        label: {
            fr: 'Études à temps plein',
            en: 'Full-time student'
        }
    },
    {
        value: 'partTimeStudent',
        label: {
            fr: 'Études à temps partiel',
            en: 'Part-time student'
        }
    },
    {
        value: 'retired',
        label: {
            fr: 'À la retraite',
            en: 'Retired'
        },
        conditional: conditionals.ifAge40OrMoreConditional
    },
    {
        value: 'atHome',
        label: {
            fr: 'À la maison',
            en: 'At home'
        }
    },
    {
        value: 'unemployed',
        label: {
            fr: 'En chômage / en recherche d\'emploi',
            en: 'Unemployed / searching for a job'
        }
    },
    {
        value: 'sickOrParentalLeave',
        label: {
            fr: 'Congé de maladie ou congé parental',
            en: 'Sick leave or parental leave'
        }
    },
    {
        value: 'longTermDisability',
        label: {
            fr: 'Invalidité de longue durée',
            en: 'Long-term disability'
        }
    },
    {
        value: 'volunteer',
        label: {
            fr: 'Bénévole',
            en: 'Volunteer'
        }
    },
    {
        value: 'other',
        label: {
            fr: 'Autre',
            en: 'Other'
        }
    },
    {
        value: 'preferNotToAnswer',
        label: {
            fr: 'Préfère ne pas répondre',
            en: 'Prefer not to answer'
        }
    }
];

export const transitFareType: ChoiceType[] = [
    ...no,
    {
        value: 'transitPass',
        label: {
            fr: 'Passe ou titre mensuel ou annuel',
            en: 'Monthly or annual pass'
        }
    },
    {
        value: 'tickets',
        label: {
            fr: 'Titres ou billets individuels',
            en: 'Individual tickets or rides'
        }
    },
    ...dontKnow
];

export const workLocationType: ChoiceType[] = [
    {
        value: 'onLocation',
        label: {
            fr: 'Oui, travail au lieu fixe en présentiel en tout temps',
            en: 'Yes, always on-site at fixed location'
        }
    },
    {
        value: 'hybrid',
        label: {
            fr: 'Oui, travail en mode hybride (télétravail et en présentiel)',
            en: 'Yes, hybrid work (remote and on-site)'
        }
    },
    {
        value: 'onTheRoadWithUsualPlace',
        label: {
            fr: 'Oui, travail sur la route avec départ d\'un lieu fixe (ex: garage, bureau, poste, restaurant, etc.)',
            en: 'Yes, work on the road departing from a fixed location (ex: garage, office, station, restaurant, etc.)'
        }
    },
    {
        value: 'onTheRoadWithoutUsualPlace',
        label: {
            fr: 'Non, travail sur la route avec départ du domicile',
            en: 'No, work on the road departing from home'
        }
    },
    {
        value: 'remote',
        label: {
            fr: 'Non, travail à partir du domicile ou à distance',
            en: 'No, work from home or from elsewhere'
        }
    }
];

export const studyLocationType: ChoiceType[] = [
    {
        value: 'onLocation',
        label: {
            fr: 'Oui, études au lieu fixe en présentiel en tout temps',
            en: 'Yes, always on-site at fixed location'
        }
    },
    {
        value: 'hybrid',
        label: {
            fr: 'Oui, études en mode hybride (télé-études et en présentiel)',
            en: 'Yes, hybrid studies (remote and on-site)'
        }
    },
    {
        value: 'remote',
        label: {
            fr: 'Non, études à partir du domicile ou à distance',
            en: 'No, remote studies from home or from elsewhere'
        }
    }
];
