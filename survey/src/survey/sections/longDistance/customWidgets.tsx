import { bboxPolygon, circle } from '@turf/turf';
import { InfoMapWidgetConfig } from 'evolution-common/lib/services/questionnaire/types';
import { getResponse } from 'evolution-common/lib/utils/helpers';
import config from 'evolution-common/lib/config/project.config';

export const householdLongDistanceIntroMap: InfoMapWidgetConfig = {
    type: 'infoMap',
    defaultCenter: config.mapDefaultCenter,
    title: {
        fr: null,
        en: null
    },
    linestringColor: '#0000ff',
    geojsons: function (interview, _path) {
        const startPointGeojsonFeatures = [];
        const startPointGeography = getResponse(interview, 'home.geography') as any;

        const startPolygonsGeojsonFeatures = [];

        if (startPointGeography) {
            const startPointGeojson = startPointGeography;
            // startPointGeojson.properties.icon = {
            //   url: `/dist/images/activities_icons/default_marker.svg`,
            //   scale: 1,
            // }
            startPointGeojson.properties.highlighted = false;
            startPointGeojsonFeatures.push(startPointGeojson);

            const centerCirclePolygon = [
                startPointGeojson.geometry.coordinates[0],
                startPointGeojson.geometry.coordinates[1]
            ];
            const radiusCirclePolygon = 40;
            const optionsCirclePolygon = {
                steps: 40,
                units: 'kilometers',
                properties: {
                    strokeColor: '#3A141F',
                    strokeOpacity: 0.8,
                    strokeWeight: 0.5,
                    fillColor: '#3A141F',
                    fillOpacity: 0.6
                }
            };
            const circlePolygon = circle(centerCirclePolygon, radiusCirclePolygon, optionsCirclePolygon as any);

            let minLat = 200;
            let maxLat = -200;
            let minLong = 200;
            let maxLong = -200;

            for (let i = 0, countI = circlePolygon.geometry.coordinates[0].length; i < countI; i++) {
                if (minLat > circlePolygon.geometry.coordinates[0][i][1]) {
                    minLat = circlePolygon.geometry.coordinates[0][i][1];
                }
                if (maxLat < circlePolygon.geometry.coordinates[0][i][1]) {
                    maxLat = circlePolygon.geometry.coordinates[0][i][1];
                }
                if (minLong > circlePolygon.geometry.coordinates[0][i][0]) {
                    minLong = circlePolygon.geometry.coordinates[0][i][0];
                }
                if (maxLong < circlePolygon.geometry.coordinates[0][i][0]) {
                    maxLong = circlePolygon.geometry.coordinates[0][i][0];
                }
            }
            // minLat  = minLat * 1.1;
            // maxLat  = maxLat  * 1.1;
            // minLong = minLong * 1.1;
            // maxLong = maxLong * 1.1;

            (circlePolygon.properties as any).minLat = minLat;
            (circlePolygon.properties as any).maxLat = maxLat;
            (circlePolygon.properties as any).minLong = minLong;
            (circlePolygon.properties as any).maxLong = maxLong;

            const bbox1 = [-180, -90, 0, 90];
            const bbox2 = [0, -90, 180, 90];

            const optionsAllEarthBox = {
                properties: {
                    strokeColor: '#58D68D',
                    strokeOpacity: 0.001,
                    strokeWeight: 0.0001,
                    fillColor: '#58D68D',
                    fillOpacity: 0.2
                }
            };
            const allEarthBox1 = bboxPolygon(bbox1 as any, optionsAllEarthBox);
            const allEarthBox2 = bboxPolygon(bbox2 as any, optionsAllEarthBox);

            startPolygonsGeojsonFeatures.push(allEarthBox1);
            startPolygonsGeojsonFeatures.push(allEarthBox2);
            startPolygonsGeojsonFeatures.push(circlePolygon);
        }

        return {
            // points: {
            //   type: "FeatureCollection",
            //   features: startPointGeojsonFeatures
            // },
            polygons: {
                type: 'FeatureCollection',
                features: startPolygonsGeojsonFeatures
            }
        };
    }
};
