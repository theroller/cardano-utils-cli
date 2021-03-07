'use strict';

const log = require('../log').child({ method: 'tx.lookupUtxos' });

const util = require('util');
const fs = require('fs');
const readFile = util.promisify(fs.readFile);

const calculateFee = require('./calculateFee');
const createTx = require('./createTx');
const findUtxos = require('./findUtxos');
const queryUtxos = require('../query-utxos');

module.exports = lookupUtxos;

async function lookupUtxos(amt, inAddrs, outAddrs, opts) {
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

    // utxos
    let utxos = [];
    if (opts.utxos.length > 0) {
        // user provided utxos
        for (let i=0; i< opts.utxos.length; i++) {
            const match = /^([\da-f]+)#(\d+):(\d+)$/.exec(opts.utxos[i]);
            if (!match) {
                throw new Error(`failed to parse user provided utxo: ${opts.utxos[i]}`);
            }

            utxos.push({
                amount: parseInt(match[3], 10),
                txHash: match[1],
                txIx: match[2],
            });
        }
    } else {
        // lookup the UTXOs for each input address on the network
        let queries = inAddrs.map(inAddr => queryUtxos(inAddr, opts));
        let utxoObjs = await Promise.all(queries);

        // flatten utxos
        utxos = utxoObjs.map(x => x.values).flat();
        log.debug({ utxos }, 'utxos');
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
        log.info({
            sourceAmount,
            amt,
            fee,
            keyDeposit: keyDeposit,
            poolDeposit: poolDeposit,
            change,
        }, 'amounts breakdown');

        // just in case, prevent an infinite loop
        count++;
    } while ((change < 0 || change < minUTxOValue) && count < utxos.length);

    return {
        change,
        fee,
        inHashes,
    };
}
