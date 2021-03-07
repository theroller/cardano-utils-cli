#!/usr/bin/env node
'use strict';

require('dotenv').config();

const program = require('commander');

const parseVerbose = require('../utils/parseVerbose');
const log = require('../utils/log');

let debug;
let execError = false;

async function run() {
    try {

        program.on('option:debug', function () {
            process.env.DEBUG = '@theroller:cardano-utils:*';
            process.env.DEBUG_COLORS = 1;
        });

        // Parse command arguments and options
        let amt;
        program
            .arguments('<amt>')
            .description('This utility generates a cardano transaction for the given amount. If the amt is zero, then all funds will be transferred from the input.')
            .option('-d, --debug', 'Output additional debug information.')
            .option('--in <value>', 'Input address (may specify multiple)', (v,p) => p.concat([v]), [])
            .option('--cert <filepath>', 'Certificate filepath (may specify multiple)', (v,p) => p.concat([v]), [])
            .option('--skey <filepath>', 'There must be on filepath for every input address respectively (may specify multiple)', (v,p) => p.concat([v]), [])
            .option('--out <value>', 'Output address (may specify multiple)', (v,p) => p.concat([v]), [])
            .option('--proto <filepath>', 'Filepath to the protocol parameters', './protocol.json')
            .option('--keyDeposit', 'Include key deposit from protocol parameters', false)
            .option('--poolDeposit', 'Include pool deposit from protocol parameters', false)
            .option('-t, --testnet', 'Use testnet magic', false)
            .option('--ttl <value>', 'OFFLINE: set the TTL without querying the tip.', 0)
            .option('--utxo <TxHash#TxIx:Amount>', 'OFFLINE: identify the UTxO(s) for the input payment addresses (may specify multiple)', (v,p) => p.concat([v]), [])
            .option('-v, --verbose', 'Verbosity level that can be increased.', parseVerbose, 0)
            .action((_amt) => {
                amt = _amt;
                debug = require('debug')('@theroller:cardano-utils:cmd:queryTx');
            });

        await program.parseAsync(process.argv);

        // Record Processing Time
        if (program.verbose > 1) {
            console.time('Processing Time');
        }

        // Display Arguments/Options
        const opts = {
            debug: program.debug,
            protoFilepath: program.proto,
            certFilepaths: program.cert,
            testnet: program.testnet,
            ttl: program.ttl,
            utxos: program.utxo,
            useKeyDeposit: program.keyDeposit,
            usePoolDeposit: program.poolDeposit,
            verbose: program.verbose,
        };
        if (program.verbose > 0) {
            log.info({
                args: program.args,
                amt,
                in: program.in,
                skey: program.skey,
                out: program.out,
                opts,
            }, 'settings');
        }

        debug('argument and options processing complete');

        // Run Command Logic
        const cmd = require('../utils/tx');
        await cmd(program.skey, program.in, program.out, amt, opts);

        log.trace('complete');
    }
    catch (err) {
        // Record the Error
        execError = true;

        // Output the Error
        log.error(err, 'processing error');
    }
    finally {
        // Display the Processing Time
        if (program && program.verbose > 1) {
            console.timeEnd('Processing Time');
        }

        // Exit with the appropriate code
        process.exit(execError);
    }
}

run();
