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

const monitoringDataCall = async (req, res, next) => {
    try {
        if (!req.query.attribute) {
            return res.status(400).json({ error: 'attribute query parameter is required' });
        }
        const attribute = req.query.attribute;
        // FIXME Validate the attribute first? Otherwise, we count on sql
        // failure if invalid. The attribute is properly escaped, so no sql
        // injection possible, but still, not a good practice.
        const startedCompletedByField = await monitoring.getStartedCompletedByAttribute(attribute);

        return res.status(200).json(startedCompletedByField);
    } catch (error) {
        console.log('Error getting interview by attribute', error);
        return res.status(500).json({ error: 'Error getting interview by attribute' });
    }
};

const monitoringDataCallToCsv = async (req, res, next) => {
    try {
        if (!req.query.attribute) {
            return res.status(400).json({ error: 'attribute query parameter is required' });
        }
        const attribute = req.query.attribute;
        const startedCompletedByField = await monitoring.getStartedCompletedByAttribute(attribute);

        const csvContent = [];
        for (const attribute in startedCompletedByField.started) {
            csvContent.push({
                attribute,
                started: startedCompletedByField.started[attribute],
                completed: startedCompletedByField.completed[attribute]
            });
        }
        res.setHeader(
            'Content-disposition',
            `attachment; filename=startedCompletedInterviewsBy${attribute}_${moment().format('YYYYMMDD')}.csv`
        );
        res.set('Content-Type', 'text/csv');
        return res.status(200).send(papaparse.unparse(csvContent));
    } catch (error) {
        console.log('Error getting interview by attribute csv', error);
        return res.status(500).json({ error: 'Error getting interview by attribute' });
    }
};

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

    router.get('/data/startedCompletedByAttribute', monitoringDataCall);

    router.get('/data/startedCompletedByAttributeCsv', monitoringDataCallToCsv);
};

export default loadRoutes;
