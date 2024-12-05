#!/bin/bash

# Check if CACHIX_AUTH_TOKEN is provided
if [ -z "$1" ]; then
    echo "Error: CACHIX_AUTH_TOKEN must be provided as first argument"
    exit 1
fi

CACHIX_AUTH_TOKEN="$1"

# Create a named volume for nix store if it doesn't exist
docker volume create nix-store

# Build the Docker image
docker build -t mintd-builder -f Dockerfile.builder .
rm -rf result

# Run the container with mounted nix store volume and pass token
docker run --rm \
    --privileged \
    -v nix-store:/nix \
    -e CACHIX_AUTH_TOKEN="$CACHIX_AUTH_TOKEN" \
    mintd-builder "$CACHIX_AUTH_TOKEN"

echo "Build completed. Check the 'result' directory for the build output."