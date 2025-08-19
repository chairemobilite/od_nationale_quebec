module.exports = {
    saguenay: {
        trRoutingScenarios: {
            SE: 'd91ee21a-4b53-40e0-ac7b-5837e0820b3c',
            SA: '0d3d4cec-142f-4a93-9f66-7b54c5111441',
            DI: 'c3ba9975-ae39-46f3-8501-46a6e8db673d'
        },
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
