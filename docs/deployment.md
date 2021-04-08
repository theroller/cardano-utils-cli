# Login to Core Node
```bash
# ssh into core node
# make a local directory for addresses and keys
mkdir ~/cardano-node/work

# shell into the container
docker exec -it cardano_core_1 zsh
# this directory can be saved to NODE_HOME
cd ~/cardano-node/work

# verify cardano-node-utils is installed
ctuils queryTip

# setup for testnet / mainnet
export NODE_CONFIG=testnet
```

# Generate Block-Producer Keys

**Block-Producer**
```bash
cd $NODE_HOME

# KES key pair
# + kes.skey
# + kes.vkey
cardano-cli node key-gen-KES \
    --verification-key-file kes.vkey \
    --signing-key-file kes.skey

# calculate startKesPeriod
# 1) get the slot KES period; expect 129600
slotsPerKESPeriod=$(cat $NODE_HOME/${NODE_CONFIG}-shelley-genesis.json | jq -r '.slotsPerKESPeriod')
echo slotsPerKESPeriod: ${slotsPerKESPeriod}
# 2) get the slotNo (testnet)
cutils queryTip -t
slotNo=x
# 3) calculate
kesPeriod=$((${slotNo} / ${slotsPerKESPeriod}))
echo kesPeriod: ${kesPeriod}
startKesPeriod=${kesPeriod}
echo startKesPeriod: ${startKesPeriod}
```

**Air-Gapped**
```bash
cd $NODE_HOME/cold-keys
pushd $NODE_HOME/cold-keys

# cold keys
# + node.counter
# + node.skey
# + node.vkey
cardano-cli node key-gen \
    --cold-verification-key-file node.vkey \
    --cold-signing-key-file node.skey \
    --operational-certificate-issue-counter node.counter
```

**Workstation**
```bash
# move kes.vkey from Block-Producer
# + kes.vkey
# USB copy to Air-Gapped
scp lovelace@_test-core0.rollerstake.com:/home/lovelace/cardano-node/work/kes.vkey .
rm kes.vkey
```

**Air-Gapped**
```bash
# cold keys
# + node.cert
cardano-cli node issue-op-cert \
    --kes-verification-key-file kes.vkey \
    --cold-signing-key-file node.skey \
    --operational-certificate-issue-counter node.counter \
    --kes-period <startKesPeriod> \
    --out-file node.cert

# USB copy to Block-Producer
scp node.cert lovelace@_test-core0.rollerstake.com:/home/lovelace/cardano-node/work
```

**Block-Producer**
```bash
# VRF key pair
# + vrf.skey
# + vrf.vkey
cardano-cli node key-gen-VRF \
    --verification-key-file vrf.vkey \
    --signing-key-file vrf.skey
chmod 400 vrf.skey

# USB MOVE to Air-Gapped
scp lovelace@_test-core0.rollerstake.com:/home/lovelace/cardano-node/work/vrf.vkey .
rm vrf.vkey

# stop all nodes with docker
# enable core node's access to certs in config
# restart all nodes

# wait until you can query the tip again
cutils queryTip -t
```

# Setup Payment and Stake Keys

**Block-Producer**
```bash
# protocol parameters
# + protocol.json
cardano-cli query protocol-parameters \
    --mainnet \
    --mary-era \
    --out-file protocol.json
```

## Create Key Pairs

**Air-Gapped**
```bash
# payment keys
# + payment.skey
# + payment.vkey
cardano-cli address key-gen \
    --verification-key-file payment.vkey \
    --signing-key-file payment.skey

# stake keys
# + stake.skey
# + stake.vkey
cardano-cli stake-address key-gen \
    --verification-key-file stake.vkey \
    --signing-key-file stake.skey

# stake address
# + stake.addr
cardano-cli stake-address build \
    --stake-verification-key-file stake.vkey \
    --out-file stake.addr \
    --mainnet

# payment to stake address
# + payment.addr
cardano-cli address build \
    --payment-verification-key-file payment.vkey \
    --stake-verification-key-file stake.vkey \
    --out-file payment.addr \
    --mainnet

# USB copy to Block-Producer
scp payment.addr lovelace@_test-core0.rollerstake.com:/home/lovelace/cardano-node/work

# testnet: use faucet to load the address; give about 15 minutes
# https://developers.cardano.org/en/testnets/cardano/tools/faucet/
```

## Register Stake Address

**Air-Gapped**
```bash
# payment keys
# + stake.cert
cardano-cli stake-address registration-certificate \
    --stake-verification-key-file stake.vkey \
    --out-file stake.cert

# USB copy to Block-Producer
scp stake.cert lovelace@_test-core0.rollerstake.com:/home/lovelace/cardano-node/work

# testnet: use faucet to load the address; give about 15 minutes
# https://developers.cardano.org/en/testnets/cardano/tools/faucet/
```

**Block-Producer**
```bash
# build stake registration
# + regStake.raw
cutils tx 0 -t -v --keyDeposit \
    --in $(cat payment.addr) \
    --out $(cat payment.addr) \
    --cert stake.cert \
    --outTxFilepath ./regStake.raw

# USB copy to Air-Gapped
scp lovelace@_test-core0.rollerstake.com:/home/lovelace/cardano-node/work/regStake.raw .
```

**Air-Gapped**
```bash
# sign transaction
# + regStake.signed
cardano-cli transaction sign \
    --tx-body-file regStake.raw \
    --signing-key-file payment.skey \
    --signing-key-file stake.skey \
    --out-file regStake.signed \
    --mainnet

# USB copy to Block-Producer
scp regStake.signed lovelace@_test-core0.rollerstake.com:/home/lovelace/cardano-node/work
```

**Block-Producer**
```bash
# submit deposit
cardano-cli transaction submit \
    --tx-file regStake.signed \
    --mainnet
    # --testnet-magic 1097911063

# check your payment address for activity in the blockchain
# https://explorer.cardano.org/en
# https://explorer.cardano-testnet.iohkdev.io/
```

## Register Stake Pool

**Block-Producer**

### Create Meta Data File: `pool-meta.json`
```json
{
    "name": "RollerStake",
    "description": "For fun and community.",
    "ticker": "0TEST",
    "homepage": "https://rollerstake.com"
}
```
Click on `RAW` and use this url with http://git.io to shorten the url.

### Register Pool

In case you need to change your registration: https://forum.cardano.org/t/re-registering-pool-updating-metadata-json/37622/7

``` bash
# create hash of meta
# + pool-hash.txt
curl -L https://git.io/?? -o pool-meta.json
cardano-cli stake-pool metadata-hash --pool-metadata-file pool-meta.json > pool-hash.txt

# USB copy to Air-Gapped
scp lovelace@_test-core0.rollerstake.com:/home/lovelace/cardano-node/work/pool-hash.txt .

# verify min pool cost: 340000000
cat protocol.json | grep minPoolCost
```

**Air-Gapped**
```bash
# pool registration
# + pool.cert
# pledge: 100 ADA
# cost: 340 ADA
# margin: 0%
cardano-cli stake-pool registration-certificate \
    --cold-verification-key-file node.vkey \
    --vrf-verification-key-file vrf.vkey \
    --pool-pledge 100000000 \
    --pool-cost 340000000 \
    --pool-margin 0 \
    --pool-reward-account-verification-key-file stake.vkey \
    --pool-owner-stake-verification-key-file stake.vkey \
    --single-host-pool-relay _test-relay0.rollerstake.com \
    --pool-relay-port 3001 \
    --single-host-pool-relay _test-relay1.rollerstake.com \
    --pool-relay-port 3001 \
    --metadata-url https://git.io/JYDj9 \
    --metadata-hash $(cat pool-hash.txt) \
    --out-file pool.cert \
    --mainnet
    # --testnet-magic 1097911063

# USB copy to Block-Producer
scp pool.cert lovelace@_test-core0.rollerstake.com:/home/lovelace/cardano-node/work

# pledge stake
# + deleg.cert
cardano-cli stake-address delegation-certificate \
    --stake-verification-key-file stake.vkey \
    --cold-verification-key-file node.vkey \
    --out-file deleg.cert

# USB copy to Block-Producer
scp deleg.cert lovelace@_test-core0.rollerstake.com:/home/lovelace/cardano-node/work
```

**Block-Producer**
```bash
# pledge stake
# + regPool.raw
cutils tx 0 -t -v --poolDeposit \
    --in $(cat payment.addr) \
    --out $(cat payment.addr) \
    --cert pool.cert \
    --cert deleg.cert \
    --outTxFilepath ./regPool.raw

# USB copy to Air-Gapped
scp lovelace@_test-core0.rollerstake.com:/home/lovelace/cardano-node/work/regPool.raw .
```

**Air-Gapped**
```bash
# pledge stake
# + regPool.signed
cardano-cli transaction sign \
    --tx-body-file regPool.raw \
    --signing-key-file payment.skey \
    --signing-key-file node.skey \
    --signing-key-file stake.skey \
    --out-file regPool.signed \
    --mainnet
    # --testnet-magic 1097911063

# USB copy to Block-Producer
scp regPool.signed lovelace@_test-core0.rollerstake.com:/home/lovelace/cardano-node/work
```

**Block-Producer**
```bash
# submit deposit
cardano-cli transaction submit \
    --tx-file regPool.signed \
    --mainnet
    # --testnet-magic 1097911063

# check your payment address for activity in the blockchain
# https://explorer.cardano.org/en
# https://explorer.cardano-testnet.iohkdev.io/
```

**Air-Gapped**
```bash
# stake pool id
# + stakepoolid.txt
cardano-cli stake-pool id --cold-verification-key-file node.vkey --output-format hex > stakepoolid.txt
cat stakepoolid.txt

# USB copy to Block-Producer
scp stakepoolid.txt lovelace@_test-core0.rollerstake.com:/home/lovelace/cardano-node/work
```

**Block-Producer**
```bash
# verify stake pool id is in the ledger
cardano-cli query ledger-state --mary-era --mainnet | grep publicKey | grep $(cat stakepoolid.txt)
# cardano-cli query ledger-state --testnet-magic 1097911063 --mary-era | grep publicKey | grep $(cat stakepoolid.txt)
```

# Retrieve Rewards

**Block-Producer**
```bash
# query rewards balance
cardano-cli query stake-address-info --mary-era \
    --address $(cat stake.addr) \
    --mainnet
    # --testnet-magic 1097911063

# empty rewards
# + tx-rewards.raw
cutils tx 0 -t -v \
    --in $(cat payment.addr) \
    --out $(cat test-wallet.addr) \
    --outTxFilepath ./tx-rewards.raw

# USB copy to Air-Gapped
scp lovelace@_test-core0.rollerstake.com:/home/lovelace/cardano-node/work/tx-rewards.raw .
```

**Air-Gapped**
```bash
# pledge stake
# + tx-rewards.signed
cardano-cli transaction sign \
    --tx-body-file tx-rewards.raw \
    --signing-key-file payment.skey \
    --out-file tx-rewards.signed \
    --mainnet
    # --testnet-magic 1097911063

# USB copy to Block-Producer
scp tx-rewards.signed lovelace@_test-core0.rollerstake.com:/home/lovelace/cardano-node/work
```

**Block-Producer**
```bash
# submit deposit
cardano-cli transaction submit \
    --tx-file tx-rewards.signed \
    --mainnet
    # --testnet-magic 1097911063

# check your payment address for activity in the blockchain
# https://explorer.cardano.org/en
# https://explorer.cardano-testnet.iohkdev.io/
```
