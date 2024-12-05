FROM ubuntu:22.04

# Install basic dependencies
RUN apt-get update && apt-get install -y \
    curl \
    xz-utils \
    sudo \
    git \
    jq \
    && rm -rf /var/lib/apt/lists/*

# Install Nix
RUN curl -L https://nixos.org/nix/install | sh -s -- --daemon

# Enable experimental features and cross-compilation
RUN mkdir -p /etc/nix && \
    echo 'experimental-features = nix-command flakes' >> /etc/nix/nix.conf && \
    echo 'system-features = kvm' >> /etc/nix/nix.conf

# Set up nix environment
ENV PATH="/nix/var/nix/profiles/default/bin:/root/.nix-profile/bin:${PATH}"
SHELL ["/bin/bash", "-c"]

# Copy the flake
WORKDIR /build
COPY . .

# Script to build and cache
COPY build-and-cache.sh /build/build-and-cache.sh
RUN chmod +x /build/build-and-cache.sh

ENTRYPOINT ["/bin/bash", "-c", "source /nix/var/nix/profiles/default/etc/profile.d/nix.sh && /build/build-and-cache.sh"]