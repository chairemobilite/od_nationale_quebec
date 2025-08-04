const moment = require('moment');
const survey = process.env.EV_VARIANT;
const variantSpecificConfig = require('./configVariantSpecific')[survey];

const holidays = ['2025-09-01', '2025-10-13', '2025-12-25', '2026-01-01'];

moment.updateLocale('fr', {
    holidays,
    holidayFormat: 'YYYY-MM-DD',
    longDateFormat: {
        LL: "dddd Do MMMM YYYY",
    }
});

moment.updateLocale('en', {
    holidays,
    holidayFormat: 'YYYY-MM-DD',
    longDateFormat: {
        LL: "dddd, MMMM Do YYYY",
    }
});

module.exports = Object.assign({
    projectShortname: `od_${survey}_2025`,
    projectDirectory: `${__dirname}/runtime`,
    logoPaths: {
        fr: `/dist/images/logo_od_${survey}_2025_fr.png`,
        en: `/dist/images/logo_od_${survey}_2025_en.png`
    },
    forceRecalculateTransitTrips: false,
    updateTransitRoutingIfCalculatedBefore: moment('2024-03-07').unix(), // timestamp, will recalculate transit trips if calculated before this date
    startButtonColor: 'turquoise', // styles for turquoise buttons are in the project's styles.scss file
    interviewableMinimumAge: 5,
    selfResponseMinimumAge: 14,
    singlePersonInterview: false,
    allowChangeSectionWithoutValidation: true,
    introductionTwoParagraph: true,
    includePartTimeStudentOccupation: true,
    includeWorkerAndStudentOccupation: true,
    acceptUnknownDidTrips: false,
    logDatabaseUpdates: true,
    allowRegistration: true,
    registerWithPassword: true,
    registerWithEmailOnly: true,
    askForAccessCode: true,
    isPartTwo: false,
    forgotPasswordPage: true,
    primaryAuthMethod: 'byField',
    adminAuth: {
        localLogin: {
            allowRegistration: true,
            registerWithEmailOnly: true,
            confirmEmail: true,
            confirmEmailStrategy: 'confirmByAdmin',
            forgotPasswordPage: true
        }
    },
    auth: {
        passwordless: false,
        anonymous: true,
        google: false,
        facebook: false,
        byField: {
            postalCodeField: 'home_postalCode'
        }
    },
    separateAdminLoginPage: true,
    surveySupportForm: true,
    captchaComponentType: 'capjs',
    mapDefaultZoom: 10,
    mapDefaultCenter: {
        lat: 46.81289,
        lon: -71.21461
    },
    mapMaxGeocodingResultsBounds: [
      {
        lat: 47.033374,
        lng: -70.8030445
      },
      {
        lat: 46.518331,
        lng: -71.671425
    }],
    detectLanguage: false,
    detectLanguageFromUrl: true,
    languages: ['fr', 'en'],
    locales: {
        fr: 'fr-CA',
        en: 'en-CA'
    },
    languageNames: {
        fr: "Français",
        en: "English"
    },
    title: {
        fr: "Enquête Nationale Origine-Destination 2025",
        en: "2025 National Origin-Destination Survey"
    },
    defaultLocale: "fr",
    timezone: 'America/Montreal',
}, variantSpecificConfig);
