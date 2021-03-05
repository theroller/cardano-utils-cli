'use strict';

const log = require('../log').child({ method: 'tx' });
const debug = require('debug')('@theroller:cardano-utils:utils:tx');

const util = require('util');
const fs = require('fs');
const readFile = util.promisify(fs.readFile);

const findUtxos = require('./findUtxos');
const queryTip = require('../query-tip');
const queryUtxos = require('../query-utxos');
const createTx = require('./createTx');
const calculateFee = require('./calculateFee');
const signTx = require('./signTx');

const { TTL_DELAY } = require('../../constants');

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
        protoFilepath: null,
        certFilepaths: [],
        testnet: false,
        useKeyDeposit: false,
        usePoolDeposit: false,
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
    if (errors.length > 0) {
        log.debug(arguments);
        throw new Error('\n * ' + errors.join('\n * '));
    }

    // lookup protocol values
    let protoParameters = await readFile(opts.protoFilepath);
    let { keyDeposit, minUTxOValue, poolDeposit } = JSON.parse(protoParameters);
    log.debug({ keyDeposit, minUTxOValue, poolDeposit, filepath: opts.protoFilepath }, 'lookup minUTxOValue');

    // handle deposits
    if (!opts.useKeyDeposit) {
        keyDeposit = 0;
    }
    if (!opts.usePoolDeposit) {
        poolDeposit = 0;
    }

    // lookup the UTXOs for each input address
    let queries = inAddrs.map(inAddr => queryUtxos(inAddr, opts));
    let utxoObjs = await Promise.all(queries);

    // flatten utxos
    const utxos = utxoObjs.map(x => x.values).flat();
    log.debug({ utxos }, 'utxos');

    // parse the amount
    amt = parseInt(amt, 10);
    if (!Number.isInteger(amt)) {
        throw new Error(`failed to convert ${amt} to an integer`);
    }

    // Since we don't know the fees ahead of time, we potentially must loop
    // through the available UTXOs until we have enough to cover the requested
    // amount and the included fee.
    let change = 0;
    let fee = 0;
    let chosenUtxos = [];
    let inHashes = [];
    let count = 0;
    do {
        log.debug(`utxo loop round ${count}`);

        chosenUtxos = findUtxos(utxos, amt + fee + keyDeposit + poolDeposit, minUTxOValue);
        log.info({ chosenUtxos }, 'chosen utxos');
        inHashes = chosenUtxos.map(utxo => `${utxo.txHash}#${utxo.txIx}`);

        // Initialize out amounts to zero except for the first item
        let outAmounts = new Array(outAddrs.length).fill(0);
        outAmounts[0] = amt;

        // draft
        let txOpts = { ttl: 0, fee, filepath: './tx.draft', certFilepaths: opts.certFilepaths, verbose: opts.verbose };
        let { tx: draftTx, filepath: draftFilepath } = await createTx(inHashes, outAddrs, outAmounts, txOpts);
        log.debug({ draftTx, draftFilepath }, 'draft tx');

        // fees
        if (poolDeposit > 0) {
            opts.witnessCount = 3;
        }
        fee = await calculateFee(draftFilepath, chosenUtxos.length, outAddrs.length, './protocol.json', opts);
        log.debug({ fee }, 'fee');

        // calculate change for source
        const sourceAmount = chosenUtxos
            .map(x => x.amount)
            .reduce((p, c) => c += p, 0);

        // calculate remaining change
        change = sourceAmount - (amt + fee + keyDeposit + poolDeposit);
        log.info({ sourceAmount, amt, fee, keyDeposit, poolDeposit, change }, 'amounts breakdown');

        // just in case, prevent an infinite loop
        count++;
    } while ((change < 0 || change < minUTxOValue) && count < utxos.length);

    // get the tip of the blockchain
    const tip = await queryTip(opts);
    log.info({ tip }, 'blockchain tip');

    // ttl
    const ttl = tip.slotNo + TTL_DELAY;
    log.info({ ttl }, 'calculated TTL');

    // allow the full input balance to transfer to the output address when amt is 0
    const outAmounts = (amt === 0) ? [change] : [amt, change];

    // final raw transaction
    let txOpts = { ttl, fee, filepath: './tx.raw', certFilepaths: opts.certFilepaths, verbose: opts.verbose };
    let { tx: rawTx, filepath: rawFilepath } = await createTx(inHashes, outAddrs, outAmounts, txOpts);
    log.debug({ rawTx, rawFilepath }, 'raw tx');

    // sign transaction
    let { tx: signedTx, filepath: signedFilepath } = await signTx(rawFilepath, inSkeys, { testnet: opts.testnet, verbose: opts.verbose });
    log.debug({ signedTx, signedFilepath }, 'signed tx');

    return signedTx;
}
