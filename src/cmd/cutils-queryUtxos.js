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
            process.env.DEBUG = '@theroller:cardano-utils-cli:*';
            process.env.DEBUG_COLORS = 1;
        });

        // Parse command arguments and options
        let address;
        program
            .arguments('<address>')
            .description('This utility generates a cardano transaction.')
            .option('-d, --debug', 'Output additional debug information.')
            .option('-t, --testnet', 'Use testnet magic', false)
            .option('-v, --verbose', 'Verbosity level that can be increased.', parseVerbose, 0)
            .action((_address) => {
                address = _address;
                debug = require('debug')('@theroller:cardano-utils-cli:cmd:queryUtxos');
            });

        await program.parseAsync(process.argv);

        // Record Processing Time
        if (program.verbose > 1) {
            console.time('Processing Time');
        }

        // Display Arguments/Options
        const opts = {
            debug: program.debug,
            testnet: program.testnet,
            verbose: program.verbose,
        };
        if (program.verbose > 0) {
            log.debug({
                args: program.args,
                opts,
            }, 'settings');
        }

        debug('argument and options processing complete');

        // Run Command Logic
        const cmd = require('../utils/query-utxos');
        const utxo = await cmd(address, opts);

        log.info({ address, utxo }, 'queryUtxos result');
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
