'use strict';

const log = require('../log').child({ method: 'tx.signTx' });
const debug = require('debug')('@theroller:cardano-utils-cli:utils:tx:signTx');

const util = require('util');
const readFile = util.promisify(require('fs').readFile);
const exec = util.promisify(require('child_process').exec);
const printCmd = require('../printCmd');

const { TEST_MAGIC_NO } = require('../../constants');

module.exports = signTx;

async function signTx(txFilepath, skeyFilepaths, opts) {
    const defaultOpts = {
        outFilepath: './tx.signed',
        testnet: false,
        verbose: false,
    };
    opts = Object.assign({}, defaultOpts, opts);

    let cmd = `cardano-cli transaction sign --out-file ${opts.outFilepath}`;

    // construct command
    if (opts.testnet) {
        cmd += ` --testnet-magic ${TEST_MAGIC_NO}`;
    } else {
        cmd += ' --mainnet';
    }

    cmd += ` --tx-body-file ${txFilepath}`;

    for (let i=0; i< skeyFilepaths.length; i++) {
        cmd += ` --signing-key-file ${skeyFilepaths[i]}`;
    }

    debug(`tx sign command: ${cmd}`);
    log.trace({ cmd }, 'signTx command');
    if (opts.verbose) {
        printCmd(cmd);
    }

    // execute command
    const { stderr } = await exec(cmd);

    if (stderr) {
        log.warn({ stderr }, 'tx sign stderr');
    }

    let result = await readFile(opts.outFilepath);
    return {
        filepath: opts.outFilepath,
        tx: JSON.parse(result)
    };
}
