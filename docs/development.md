# Development Notes

## How to run a local relay/pool node pair
The easiest way to get this up is to initially get a relay node running, then copy the entire directory (config and db) to create the pool (aka producer) node. This way you don't have to wait for the pool node to sync its database.

1. Follow cardano node installation instructions, https://cardano-foundation.gitbook.io/stake-pool-course/stake-pool-guide/getting-started/install-node.
    * NOTE: a shortcut to building the cardano-node and cardano-cli executables is to build them once and copy the binaries to your development machine. I also currently install cabal, ghc, and libsodium but am not sure if those are required to run or only required for building. If the latter, then you only have to copy the binaries.
1. Launch the relay node and allow it to synchronize overnight.
    ```bash
    mkdir -p ~/cardano/relay
    cd ~/cardano/relay
    
    # download configuration files (https://cardano-foundation.gitbook.io/stake-pool-course/stake-pool-guide/getting-started/getconfigfiles_and_connect)
    curl -sSL https://hydra.iohk.io/job/Cardano/cardano-node/cardano-deployment/latest-finished/download/1/testnet-config.json
    curl -sSL https://hydra.iohk.io/job/Cardano/cardano-node/cardano-deployment/latest-finished/download/1/testnet-shelley-genesis.json
    curl -sSL https://hydra.iohk.io/job/Cardano/cardano-node/cardano-deployment/latest-finished/download/1/testnet-byron-genesis.json
    curl -sSL https://hydra.iohk.io/job/Cardano/cardano-node/cardano-deployment/latest-finished/download/1/testnet-topology.json

    cardano-node run --topology testnet-topology.json --database-path db --socket-path db/node.socket --config testnet-config.json --host-addr 0.0.0.0 --port 3001
    ```
1. Once synchronized, stop the relay node to make the **pool** node.
    ```bash
    cp -r ~/cardano/relay ~/cardano/pool
    cd ~/cardano/pool
    ```
    1. Update the `testnet-topology.json` to only point to the relay node using the private ip address.
    ```json
    {
    "Producers": [
        {
        "addr": "172.x.x.x",
        "port": 3001,
        "valency": 1
        }
    ]
    }
    ```
1. Update the **relay** node's `testnet-topology.json` to point to the pool node and 2 public relay nodes (https://explorer.cardano-testnet.iohkdev.io/relays/topology.json).
    ```json
    {
    "Producers": [
        {
        "addr": "172.x.x.x",
        "port": 3002,
        "valency": 1
        },
        {
        "addr": "some.relay.com",
        "port": 3001,
        "valency": 1
        },
        {
        "addr": "some-other.relay.com",
        "port": 3001,
        "valency": 1
        }
    ]
    }
    ```
1. Install `cardano-rt-view` to keep an eye on how the nodes are behaving, https://github.com/input-output-hk/cardano-rt-view.
    ```bash
    cd /tmp
    curl -sSL https://github.com/input-output-hk/cardano-rt-view/releases/download/0.3.0/cardano-rt-view-0.3.0-linux-x86_64.tar.gz
    tar xzvf cardano-rt-view-0.3.0-linux-x86_64.tar.gz
    sudo mv cardano-rt-view /usr/local/bin
    sudo mkdir -p /opt/cardano-rt-view
    mv static /opt/cardano-rt-view
    ```
    1. Run through the installation dialog and specify `/opt/cardano-rt-view/static` as the location of the static files. Make sure to specify the relay node first (relay-1) and port 3001.
    1. Stop the RT View. We will need to configure the nodes to output to the viewer. The example settings from running through the config were after specifying a 2 node setup where the first node is my relay node at port 3001. This is important so that we launch the pool node on the right port (you can always edit this config directly `vi ~/.config/cardano-rt-view.json` if your node ports are not consecutive).
        ```
        1. Find setupBackends and add TraceForwarderBK in it:

        "setupBackends": [
            "TraceForwarderBK"
        ]

        2. Find TurnOnLogMetrics and set it to True:

        "TurnOnLogMetrics": true

        3. Find options -> mapBackends and redirect required metrics to TraceForwarderBK, for example:

        "options": {
            "mapBackends": {
            "cardano.node-metrics": [
                "TraceForwarderBK"
            ],
            "cardano.node.Forge.metrics": [
                "TraceForwarderBK"
            ],
            ...
            }

        For more info about supported metrics please read the documentation.

        4. Since you have 2 nodes, add following traceForwardTo sections in the root of their configuration files:

        "traceForwardTo": {
            "tag": "RemoteSocket",
            "contents": [
            "0.0.0.0",
            "3001"
            ]
        }

        "traceForwardTo": {
            "tag": "RemoteSocket",
            "contents": [
            "0.0.0.0",
            "3002"
            ]
        }
        ```
    1. Ensure that all of the above settings are applied to the `testnet-topology.json` files. The relay node will run with `--port 3001` and the pool node will run with `--port 3002` with the above settings.
1. Start the RT View and nodes
    ```bash
    # terminal 1
    cardano-rt-view

    # terminal 2
    cd ~/cardano/relay
    cardano-node run --topology testnet-topology.json --database-path db --socket-path db/node.socket --config testnet-config.json --host-addr 0.0.0.0 --port 3001
    
    # terminal 3
    cd ~/cardano/pool
    cardano-node run --topology testnet-topology.json --database-path db --socket-path db/node.socket --config testnet-config.json --host-addr 0.0.0.0 --port 3002
    ```
1. View the nodes in your browser: http://localhost:8024/. Check that the relay node sees to public peers and the pool node only sees the relay node. Both nodes should be on the same epoch/slot (can also see this in the terminals for the nodes).
