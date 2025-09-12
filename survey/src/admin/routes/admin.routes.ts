/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import type { Router } from 'express';
import moment from 'moment-timezone';
import papaparse from 'papaparse';
import * as monitoring from '../monitoring';

// Registers admin monitoring routes.
const loadRoutes = (router: Router): void => {
    // Update monitoring cache
    router.all('/data/updateMonitoringCache', (_req, res, _next) => {
        monitoring
            .refreshMonitoringCache()
            .then(() => {
                return res.status(200).json({
                    status: 'interview_monitoring_cache_updated_successfully'
                });
            })
            .catch((error) => {
                return res.status(500).json({
                    status: 'error',
                    error: 'could not update interview monitoring cache: ' + error
                });
            });
    });

    // Download tracking data CSV
    router.get('/data/downloadTrackingDataCSV', async (_req, res, _next) => {
        try {
            const data = await monitoring.trackingData();
            res.setHeader(
                'Content-disposition',
                `attachment; filename=downloadTrackingDataCSV_${moment().format('YYYYMMDD')}.csv`
            );
            res.set('Content-Type', 'text/csv');
            return res.status(200).send(papaparse.unparse(data));
        } catch (error) {
            return res.status(500).json({
                status: 'error',
                error: 'could not download tracking data: ' + error
            });
        }
    });
};

export default loadRoutes;
