#!/usr/bin/env node

const program = require('commander');
const { version } = require('../../package.json');

program
    .version(version)
    .description('Command to assist with cardano-node.')
    .command('queryTip', 'query the tip')
    .command('queryUtxos', 'query all UTXOs for an address')
    .command('tx', 'generate a transaction')
    .parse(process.argv);
