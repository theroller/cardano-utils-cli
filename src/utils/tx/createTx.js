'use strict';

const log = require('../log').child({ method: 'tx.createTx' });
const debug = require('debug')('@theroller:cardano-utils-cli:utils:tx:createTx');

const util = require('util');
const readFile = util.promisify(require('fs').readFile);
const exec = util.promisify(require('child_process').exec);
const printCmd = require('../printCmd');

module.exports = createTx;

async function createTx(inHashes=[], outAddrs=[], outAmounts=[], opts) {
    const defaultOpts = {
        fee:0,
        filepath:'./tx.draft',
        certFilepaths: [],
        ttl:0,
        verbose: false,
    };
    opts = Object.assign({}, defaultOpts, opts);

    let cmd = `cardano-cli transaction build-raw --out-file ${opts.filepath}`;

    // validations
    const errors = [];
    if (inHashes.length < 1) {
        errors.push('at least one input must be specified');
    }
    if (!inHashes.every(x => /^[0-9a-f]{64}#\d+$/.test(x))) {
        errors.push('inputs must have the format TxHash#TxIx');
    }
    if (outAddrs.length < 1) {
        errors.push('at least 1 output address must be specified');
    }
    if (inHashes.every(x => /^addr_[0-9a-z]{58}#\d+$/.test(x))) {
        errors.push('outputs must have the format addr_xxx');
    }
    if (outAddrs.length !== outAmounts.length) {
        errors.push('output addresses does not match the number of output amounts');
    }
    if (!outAmounts.every(x => /^\d+$/.test(x))) {
        errors.push('amounts be a natural number');
    }
    if (errors.length > 0) {
        log.debug(arguments);
        throw new Error('\n * ' + errors.join('\n * '));
    }

    // inputs
    for (let i=0; i< inHashes.length; i++) {
        cmd += ` --tx-in ${inHashes[i]}`;
    }
    // outputs
    for (let i=0; i< outAddrs.length; i++) {
        cmd += ` --tx-out ${outAddrs[i]}+${outAmounts[i]}`;
    }
    // ttl
    cmd += ` --ttl ${opts.ttl}`;
    // fee
    cmd += ` --fee ${opts.fee}`;
    // certificate
    for (let i=0; i< opts.certFilepaths.length; i++) {
        cmd += ` --certificate-file ${opts.certFilepaths[i]}`;
    }

    debug(`tx command: ${cmd}`);
    log.debug({ cmd }, 'createTx command');
    if (opts.verbose) {
        printCmd(cmd);
    }

    const { stderr } = await exec(cmd);

    if (stderr) {
        log.warn({ stderr }, 'tx stderr');
    }

    let result = await readFile(opts.filepath);
    return {
        filepath: opts.filepath,
        tx: JSON.parse(result)
    };
}
