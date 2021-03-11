'use strict';

const log = require('./log').child({ method: 'queryUtxos' });
const debug = require('debug')('@theroller:cardano-utils-cli:utils:queryUtxos');

const util = require('util');
const exec = util.promisify(require('child_process').exec);
const printCmd = require('./printCmd');

const { TEST_MAGIC_NO } = require('../constants');

module.exports = queryUtxos;

async function queryUtxos(address, opts) {
    const defaultOpts = {
        testnet: false,
        verbose: false,
    };
    opts = Object.assign({}, defaultOpts, opts);

    let cmd = `cardano-cli query utxo --mary-era --address ${address}`;
    if (opts.testnet) {
        cmd += ` --testnet-magic ${TEST_MAGIC_NO}`;
    } else {
        cmd += ' --mainnet';
    }

    debug(`queryUtxos command: ${cmd}`);
    log.debug({ cmd }, 'queryUtxos command');
    if (opts.verbose) {
        printCmd(cmd);
    }

    const { stdout, stderr } = await exec(cmd);
    if (stderr) {
        log.warn({ stderr }, 'queryUtxos stderr');
    }
    if (stdout) {
        let lines = stdout.split(/\r?\n/).filter(x => !/^\s*$/.test(x));
        // lines = lines.slice(0,2);

        // Find the line with values (after line with dashes)
        const valuesLineNum = lines.findIndex(line => /-{5,}/.test(line)) + 1;

        const values = [];
        let balance = 0;
        for (let i=valuesLineNum; i<lines.length; i++) {
            const valueLine = lines.slice(i)[0];
            let [txHash, txIx, amount] = valueLine.split(/\s+/);

            // convert amount to integer
            amount = parseInt(amount, 10);

            const utxo = { amount, txHash, txIx };
            values.push(utxo);

            balance += amount;

            log.debug({ utxo }, 'found utxo');
        }

        return {
            balance,
            count: values.length,
            values,
        };
    }
}
