# cardano-utils
Cardano utilities.

The CLI has built-in help information. Use the following commands to get to the help.

```bash
npm link
cardano-utils -h
```

## Devcontainer
This project is setup to use a workspace (`.devcontainer/worksapce.code-workspace`) which houses an instance of a core and relay node under `node-test/`. This allows you to launch the nodes inside of the devcontainer to test the cli against. Refer to [docs/development](./docs/development.md).

### Devcontainer TODO:
* `cardano-cli` and `cardano-node` binaries are currently downloaded from a OneDrive location because of how long it takes to build those executables. The build process should be more transparent in the devcontainer.

## Logs
Logs are controlled with environment variable `CUTIL_LOG`. Set this to the minimum log value
* TRACE (default)
* DEBUG
* INFO
* WARN
* ERROR
* FATAL

A good setup for development is to set the logging output to `INFO` and turn on verbosity for the command which will show the commands generated for each step in building the transaction.

## Usage

### tx
Create transactions. Offline transactions can be created by specifying the TTL and the UTxOs.

#### Simple Transaction
```bash
# simple transaction on testnet
# 1000000 from payment2.addr => paymentwithstake.addr
cutil tx 1000000 -t -v --in $(cat payment2.addr) --skey payment2.skey \
    --out $(cat paymentwithstake.addr) \
    --out $(cat payment2.addr)
```

#### Register Stake Address (Key Deposit)
```bash
# HOT
cutil tx 0 -v --keyDeposit \
    --in $(cat paymentwithstake.addr) \
    --out $(cat paymentwithstake.addr) \
    --cert stake.cert \
    --outTxFilepath ./regStake.raw

# COLD
cardano-cli transaction sign \
    --tx-body-file regStake.raw \
    --signing-key-file payment.skey \
    --signing-key-file stake.skey \
    --mainnet \
    --out-file regStake.signed

# HOT
cardano-cli transaction submit \
    --mainnet \
    --tx-file regStake.signed
```

#### Register Stake Pool (Pool Deposit)
```bash
#HOT
cutil tx 0 -v --poolDeposit \
    --in $(cat paymentwithstake.addr) \
    --out $(cat paymentwithstake.addr) \
    --cert pool-registration.cert \
    --cert delegation.cert \
    --outTxFilepath ./regPool.raw

# COLD
cardano-cli transaction sign \
    --tx-body-file regPool.raw \
    --signing-key-file payment.skey \
    --signing-key-file stake.skey \
    --signing-key-file cold.skey \
    --mainnet \
    --out-file regPool.signed

# HOT
cardano-cli transaction submit \
    --mainnet \
    --tx-file regPool.signed

cardano-cli query ledger-state --mainnet --mary-era | grep publicKey | grep $(cat poolid.txt)
```
