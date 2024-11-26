# Boardwalkcash

## Getting started

We use [Nix](https://nixos.org/) and [devenv](https://devenv.sh/) to setup the development environment. To start:

1. Install `Nix`
   - use [determinate systems](https://determinate.systems/nix-installer/) to install with flakes enabled out of the box:
   ```sh
   curl --proto '=https' --tlsv1.2 -sSf -L https://install.determinate.systems/nix | sh -s -- install --determinate
   ```
   - or [install manually](https://nix.dev/install-nix.html) (on macOS run `sh <(curl -L https://nixos.org/nix/install)`) and then enable flakes as described [here](https://wiki.nixos.org/wiki/Flakes)
2. [Install](https://direnv.net/docs/installation.html) `direnv` (for automatic shell activation):
   - on macOS run `brew install direnv`
   - add the direnv hook to your shell as described [here](https://direnv.net/docs/hook.html)
