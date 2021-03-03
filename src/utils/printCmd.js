'use strict';

module.exports = printCmd;

function printCmd(cmd) {
    // break apart on the options
    let lines = cmd.split(/ --/);

    let primary = lines[0];
    // add back -- to the options
    let options = lines.slice(1).map(x => `--${x}`);
    let result = [primary].concat(options.sort());

    console.log(result);
}
