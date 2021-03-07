'use strict';

const log = require('../log').child({ method: 'tx' });

const fs = require('fs');

const createTx = require('./createTx');
const lookupUtxos = require('./lookupUtxos');
const queryTip = require('../query-tip');
const signTx = require('./signTx');

module.exports = tx;

/**
 * Auto-calculates the TTL and minimum fee.
 * @param {Array} inAddrs Input addresses
 * @param {Array} outAddrs Output addresses
 * @param {Array} amt Amount to send
 * @param {Oject} opts Options
 */
async function tx(inSkeys, inAddrs, outAddrs, amt, opts) {
    const defaultOpts = {
        certFilepaths: [],
        fee: null,
        offline: false,
        protoFilepath: null,
        testnet: false,
        ttlDelay: 0,
        useKeyDeposit: false,
        usePoolDeposit: false,
        utxos: [],
    };
    opts = Object.assign({}, defaultOpts, opts);

    // validations
    const errors = [];
    try {
        fs.accessSync(opts.protoFilepath, fs.constants.F_OK);
    } catch(err) {
        errors.push(`could not access protocol parameters\n${err}`);
    }
    opts.certFilepaths.forEach(filepath => {
        try {
            if (filepath) {
                fs.accessSync(filepath, fs.constants.F_OK);
            }
        } catch(err) {
            errors.push(`could not access certificate\n${err}`);
        }
    });
    // validations
    amt = parseInt(amt, 10);
    if (!Number.isInteger(amt)) {
        errors.push(`failed to convert ${amt} to an integer`);
    }
    if (errors.length > 0) {
        log.debug(arguments);
        throw new Error('\n * ' + errors.join('\n * '));
    }

    // utxos
    const { change, fee, inHashes } = await lookupUtxos(amt, inAddrs, outAddrs, opts);

    // ttl
    // get the tip of the blockchain
    const tip = await queryTip(opts);
    log.info({ tip }, 'blockchain tip');

    // ttl
    const ttl = tip.slotNo + parseInt(opts.ttlDelay, 10);
    log.info({ ttl }, 'calculated TTL');

    // allow the full input balance to transfer to the output address when amt is 0
    const outAmounts = (amt === 0) ? [change] : [amt, change];

    // final raw transaction
    let txOpts = { ttl, fee, filepath: './tx.raw', certFilepaths: opts.certFilepaths, verbose: opts.verbose };
    let { tx: rawTx, filepath: rawFilepath } = await createTx(inHashes, outAddrs, outAmounts, txOpts);
    log.debug({ rawTx, rawFilepath }, 'raw tx');

    // sign transaction
    if (inSkeys.length > 0) {
        let { tx: signedTx, filepath: signedFilepath } = await signTx(rawFilepath, inSkeys, { testnet: opts.testnet, verbose: opts.verbose });
        log.debug({ signedTx, signedFilepath }, 'signed tx');
        return signedTx;
    } else {
        return rawTx;
    }
}
