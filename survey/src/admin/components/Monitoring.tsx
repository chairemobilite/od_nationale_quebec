/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import CsvExports from './CsvExports';
import StartedAndCompletedByAttribute from './StartedAndCompletedByAttribute';

// TODO Support more graphs: maybe instead of having all possible attribute
// graph, have a dropdown to select the attribute? and add the graph to the
// page? And add it to a user's preferences?
const StartedAndCompletedByStrate: React.FC = () => (
    <StartedAndCompletedByAttribute attributeName="strate" direction="vertical" />
);

export default [CsvExports, StartedAndCompletedByStrate];
