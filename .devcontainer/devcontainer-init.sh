#!/bin/bash
set -e

# docker
# .devcontainer/.ssh/known_hosts must be updated for new contexts
# https://forums.docker.com/t/docker-context-problem/95105/3
# docker context create aa0 --docker "host=ssh://saAll@10.101.0.200" --default-stack-orchestrator swarm --description "all-access swarm"

# nvm
nvm install --lts
