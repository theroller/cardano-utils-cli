'use strict';

module.exports = findUtxos;

// Find UTXOs to cover the transfer amount
function findUtxos(utxos, amount, minUtxo) {
    // sort utxos in ascending amount order
    // this will cause smaller amounts to group together and conlidate into fewer utxos
    let _utxos = utxos.slice().sort((a,b) => a.amount - b.amount);

    let sum = 0;
    for (let i=0; i<_utxos.length; i++) {
        sum += _utxos[i].amount;
        if (sum >= amount) {
            // include additional utxos to meet the minimum change
            if (sum - amount < minUtxo) {
                continue;
            }
            return _utxos.slice(0, i+1);
        }
    }

    throw new Error(`insufficient funds in utxos for amount ${amount}`);
}
