module.exports = {
    saguenay: {
        // FIXME Need to setup Transition scenarios for Saguenay
        /*trRoutingScenarios: {
            SE: 'scenario uuid for week days',
            SA: 'scenario uuid for saturday',
            DI: 'scenario uuid for sunday'
        }, */
        mapDefaultCenter: {
            lat: 48.42877420,
            lon: -71.0620784
        },
        mapMaxGeocodingResultsBounds: [{
            lat: 48.685988478,
            lng: -70.6606085455
        }, {
            lat: 48.220212043992,
            lng: -71.61559638814
        }],
        title: {
            fr: "Enquête Origine-Destination 2025",
            en: "2025 Origin-Destination Survey "
        }
    },
    nationale: {
        mapDefaultZoom: 8,
        mapDefaultCenter: {
            lat: 46.19474,
            lon: -72.81545
        },
        mapMaxGeocodingResultsBounds: [{
            lat: 50.4074347,
            lng: -65.197417
        }, {
            lat: 44.720910,
            lng: -75.591833
        }],
        title: {
            fr: "Enquête Nationale Origine-Destination 2025",
            en: "2025 National Origin-Destination Survey "
        }
    }
}
