'use strict';

const { name, version } = require('../../package.json');
const bunyan = require('bunyan');
const bunyanFormat = require('bunyan-format');

const log = bunyan.createLogger({
    name,
    version,
    streams: [
        {
            level: process.env.CNODE_LOG || 'trace',
            stream: bunyanFormat({ outputMode: 'short', color: true })
        },
        {
            type: 'rotating-file',
            path: '/tmp/cnode.log',
            level: process.env.CNODE_LOG || 'trace',
        },
    ]
});

module.exports = log;
