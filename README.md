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
