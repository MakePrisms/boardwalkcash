# Boardwalkcash

## Getting started

We use [Nix](https://nixos.org/) and [devenv](https://devenv.sh/) to setup the development environment. To start:
1. Install `Nix` (on macOS run `sh <(curl -L https://nixos.org/nix/install)`
2. Install `devenv` (on macOS run `nix-env -iA devenv -f https://github.com/NixOS/nixpkgs/tarball/nixpkgs-unstable`
3. Install `direnv` (for automatic shell activation):
   * on macOS run `brew install direnv`
   * add the direnv hook to your shell as described [here](https://direnv.net/docs/hook.html)