# Customize your codespace development environment here
FROM mcr.microsoft.com/vscode/devcontainers/base:0.156.0-ubuntu-18.04

ARG DEBIAN_FRONTEND=noninteractive
ARG PYTHON_VER=python3.8

RUN apt-get update \
    && apt-get install -y --no-install-recommends --no-install-suggests \
        software-properties-common \
        python3-pip \
        tzdata \
    && apt-get -y --purge autoremove

WORKDIR /tmp

# aws
ARG AWS_VER=2.1.27
RUN cd /tmp \
    && curl -sSL https://awscli.amazonaws.com/awscli-exe-linux-x86_64-${AWS_VER}.zip -o awscliv2.zip \
    && unzip awscliv2.zip \
    && ./aws/install \
    && rm -rf awscliv2.zip aws \
    && aws --version

# setup aws
COPY .aws /tmp/.aws/
RUN mkdir -p ~/.aws \
    && cp -r /tmp/.aws/ ~ \
    && rm -rf /tmp/.aws

# https://github.com/microsoft/vscode-dev-containers/tree/master/containers/docker-from-docker

# docker cli
ARG DOCKER_VER=5:20.10.0~3-0~ubuntu-bionic
ENV DOCKER_BUILDKIT=1
RUN curl -fsSL https://download.docker.com/linux/$(lsb_release -is | tr '[:upper:]' '[:lower:]')/gpg | apt-key add - 2>/dev/null \
    && echo "deb [arch=amd64] https://download.docker.com/linux/$(lsb_release -is | tr '[:upper:]' '[:lower:]') $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list \
    && apt-get update \
    && apt-get install -y docker-ce-cli=${DOCKER_VER}

# docker-compose
ENV COMPOSE_DOCKER_CLI_BUILD=1
RUN LATEST_COMPOSE_VERSION=$(curl -sSL "https://api.github.com/repos/docker/compose/releases/latest" | grep -o -P '(?<="tag_name": ").+(?=")') \
    && curl -sSL "https://github.com/docker/compose/releases/download/${LATEST_COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose \
    && chmod +x /usr/local/bin/docker-compose

# nvm
ARG NVM_VER=0.37.2
RUN curl -sSo- https://raw.githubusercontent.com/nvm-sh/nvm/v${NVM_VER}/install.sh | bash

# timezone
ARG TZ=America/Los_Angeles
RUN ln -fs /usr/share/zoneinfo/${TZ} /etc/localtime \
    && dpkg-reconfigure tzdata

# setup SSH
COPY .ssh /tmp/.ssh/
RUN mkdir -p ~/.ssh \
    && chmod 600 ~/.ssh \
    && cp -r /tmp/.ssh/ ~ \
    && rm -rf /tmp/.ssh

# aliases
COPY .bash_aliases /tmp/
RUN mv /tmp/.bash_aliases ~/.bash_aliases \
    && echo 'source ~/.bash_aliases' >> ~/.bashrc

# scripts
ENV PATH=~/scripts:${PATH}
COPY scripts /tmp/scripts/
RUN chmod +x /tmp/scripts/* \
    && mv /tmp/scripts ~

# cardano

RUN apt-get update && apt-get install -y \
  autoconf \
  automake \
  build-essential \
  g++ \
  git \
  jq \
  libffi-dev \
  libgmp-dev \
  libncursesw5 \
  libssl-dev \
  libsystemd-dev \
  libtinfo-dev \
  libtool \
  make \
  pkg-config \
  zlib1g-dev

## libsodium
# Build and install the IOHK fork of libsodium.
RUN git clone https://github.com/input-output-hk/libsodium \
  && cd libsodium \
  && git checkout 66f017f1 \
  && ./autogen.sh \
  && ./configure \
  && make -j16 \
  && make install
ENV LD_LIBRARY_PATH="/usr/local/lib:$LD_LIBRARY_PATH"
ENV PKG_CONFIG_PATH="/usr/local/lib/pkgconfig:$PKG_CONFIG_PATH"

## cardano-cli / cardano-node v1.25.1
# eventually bring this into the devcontainer, for now the cardano binaries are built externally
ADD https://onedrive.live.com/download?cid=B5030F105D60037F&resid=B5030F105D60037F%2184432&authkey=ADJAhRNzHsnwdj8 /usr/local/bin/cardano-cli
ADD https://onedrive.live.com/download?cid=B5030F105D60037F&resid=B5030F105D60037F%2184434&authkey=APv3Jg-0yM720RQ /usr/local/bin/cardano-node

## cardano-rt-view
ARG CARDANO_RT_VIEW_VER=0.3.0
RUN curl -fsSL https://github.com/input-output-hk/cardano-rt-view/releases/download/${CARDANO_RT_VIEW_VER}/cardano-rt-view-${CARDANO_RT_VIEW_VER}-linux-x86_64.tar.gz -o cardano-rt-view.tgz \
    && tar xzvf cardano-rt-view.tgz \
    && mv cardano-rt-view /usr/local/bin \
    && mkdir -p /opt/cardano-rt-view \
    && mv static /opt/cardano-rt-view

RUN chmod +x /usr/local/bin/cardano*

# change root's primary group to the wsl user
RUN groupadd 1000 \
    && usermod -g 1000 root
