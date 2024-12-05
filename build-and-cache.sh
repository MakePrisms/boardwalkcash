#!/bin/bash

set -ex

# Enable flakes and nix-command
export NIX_CONFIG="experimental-features = nix-command flakes"
export USER=root

# Configure Cachix with auth token from environment variable
if [ -z "$CACHIX_AUTH_TOKEN" ]; then
    echo "Error: CACHIX_AUTH_TOKEN environment variable must be set"
    exit 1
fi

# Configure Cachix with auth token
cachix authtoken "$CACHIX_AUTH_TOKEN"

cachix use gudnuf

# Build for aarch64-linux platform and show detailed output
nix build .# \
  --system aarch64-linux \
  --json \
  | jq -r '.[].outputs | to_entries[].value'

  ls result
ls result/bin

cachix push gudnuf result
