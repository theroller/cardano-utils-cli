'use strict';

const log = require('../log').child({ method: 'tx.calculateFee' });
const debug = require('debug')('@theroller:cardano-utils:utils:tx:calculateFee');

const util = require('util');
const exec = util.promisify(require('child_process').exec);
const printCmd = require('../printCmd');

const { TEST_MAGIC_NO } = require('../../constants');

module.exports = calculateFee;

async function calculateFee(txPath, numInputs, numOutputs, protocolFilepath='./protocol.json', opts) {
    const defaultOpts = {
        testnet: false,
        verbose: false,
    };
    opts = Object.assign({}, defaultOpts, opts);

    let cmd = 'cardano-cli transaction calculate-min-fee';
    cmd += ` --tx-body-file ${txPath}`;
    cmd += ` --tx-in-count ${numInputs}`;
    cmd += ` --tx-out-count ${numOutputs}`;
    cmd += ' --witness-count 1';
    cmd += ' --byron-witness-count 0';
    cmd += ` --protocol-params-file ${protocolFilepath}`;

    if (opts.testnet) {
        cmd += ` --testnet-magic ${TEST_MAGIC_NO}`;
    } else {
        cmd += ' --mainnet';
    }

    debug(`calculateFee command: ${cmd}`);
    log.debug({ cmd }, 'calculateFee command');
    if (opts.verbose) {
        printCmd(cmd);
    }

    const { stdout, stderr } = await exec(cmd);

    if (stderr) {
        log.warn({ stderr }, 'calculateFee stderr');
    }
    if (stdout) {
        let lines = stdout.split(/\r?\n/);
        const [ feeString ] = lines[0].split(/\s+/);
        const fee = parseInt(feeString, 10);
        if (Number.isNaN(fee)) {
            throw new Error(`failed to convert ${feeString} to an integer`);
        }

        return fee;
    }
}
