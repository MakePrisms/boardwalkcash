# Boardwalkcash

This app is using [Remix](https://remix.run/docs) framework but it is hosted on a custom [express](https://expressjs.com/) server.

## Getting started

We use [Nix](https://nixos.org/) and [devenv](https://devenv.sh/) to setup the development environment. To start:
1. Install `Nix` (on macOS run `sh <(curl -L https://nixos.org/nix/install)`
2. Install `devenv` (on macOS run `nix-env -iA devenv -f https://github.com/NixOS/nixpkgs/tarball/nixpkgs-unstable`
3. Install `direnv` (for automatic shell activation):
    * on macOS run `brew install direnv`
    * add the direnv hook to your shell as described [here](https://direnv.net/docs/hook.html)
4. Install the packages with `bun i`


## Development

Run the dev server:

```shellscript
bun run dev
```

## Deployment

First, build your app for production:

```sh
bun run build
```

Then run the app in production mode:

```sh
bun start
```