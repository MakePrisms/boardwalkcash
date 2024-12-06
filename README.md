# Boardwalkcash

This app is using [Remix](https://remix.run/docs) framework, but it is hosted on a custom [express](https://expressjs.com/) server.

## Getting started

We use [Nix](https://nixos.org/) and [devenv](https://devenv.sh/) to set up the development environment. To start:
1. Install `Nix` (on macOS run `sh <(curl -L https://nixos.org/nix/install)`
2. Install `devenv` (on macOS run `nix-env -iA devenv -f https://github.com/NixOS/nixpkgs/tarball/nixpkgs-unstable`
3. Install `direnv` (for automatic shell activation):
    * on macOS run `brew install direnv`
    * add the direnv hook to your shell as described [here](https://direnv.net/docs/hook.html)
4. Install the packages with `bun i`

## Development

Run the dev server:

```sh
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

The app is deployed to Vercel. Every push to GitHub triggers a new Vercel deployment. Pushes to `main` branch
are deploying a new live version. Currently, Vercel doesn't support running Remix with custom server (see the docs 
[here](https://vercel.com/docs/frameworks/remix#using-a-custom-server-file)). This means that our custom express server
is used only when running locally. We are still keeping the express server because the plan is to eventually move to
self-hosting.

## Code style & formatting

Type checking is separated from build and is performed using Typescript compiler. To run type check manually run 
`bun run typecheck` command.

[Biome](https://biomejs.dev/) is used for code linting and formatting. Supported commands:
- `bun run lint` - runs linter and performs safe fixes
- `bun run lint:check` - runs lint check only
- `bun run format` - runs formatter and performs fixes
- `bun run format:check` - runs format check only
- `bun run fix:all` - runs type checking, linter and formatter and performs safe fixes
- `bun run fix:staged` - runs type checking, linter and formatter on git staged files only and performs safe fixes
- `bun run check:all` - runs type, lint and format checks only

Types, formatting and code styles are enforced using pre-commit hook. For nicer development experience it is recommended 
to enable auto linting and formatting on file save in IDE. Instructions for that can be found [here](https://biomejs.dev/guides/editors/first-party-extensions/).
Pre-commit hook is configured using devenv (see `devenv.nix` file) and it runs `bun run fix:staged` command. 

Lint & formatting configs are defined in `biome.jsonc` file.