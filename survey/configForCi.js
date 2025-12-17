const config = require('./config');

// Set survey end date to 3 days from now, to make sure the survey is always active in CI environments
config.endDateTimeWithTimezoneOffset = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

module.exports = config;