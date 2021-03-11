'use strict';

const log = require('./log').child({ method: 'queryTip' });
const debug = require('debug')('@theroller:cardano-utils-cli:utils:queryTip');

const util = require('util');
const exec = util.promisify(require('child_process').exec);
const printCmd = require('./printCmd');

const { TEST_MAGIC_NO } = require('../constants');

module.exports = queryTip;

async function queryTip(opts) {
    const defaultOpts = {
        testnet: false,
        verbose: false,
    };
    opts = Object.assign({}, defaultOpts, opts);

    let cmd = 'cardano-cli query tip';
    if (opts.testnet) {
        cmd += ` --testnet-magic ${TEST_MAGIC_NO}`;
    } else {
        cmd += ' --mainnet';
    }

    debug(`queryTip command: ${cmd}`);
    log.debug({ cmd }, 'queryTip command');
    if (opts.verbose) {
        printCmd(cmd);
    }

    const { stdout, stderr } = await exec(cmd);
    if (stderr) {
        log.warn({ stderr }, 'queryTip stderr');
    }
    if (stdout) {
        const result = JSON.parse(stdout);
        return result;
    }
}
