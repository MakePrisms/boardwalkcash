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

`master` is the main branch. When working on a feature, branch of `master` and when ready make a PR back to `master`.
Try to make feature branches short-lived and concise (avoid implementing multiple features in one PR).

### Updating development environment

To update devenv packages run `devenv update`. When updating `bun`, make sure to update the `engines` version in 
`package.json` and version specified in `.github/actions/setup-environment/action.yml`. When updating `node`, update the
`.nvmrc` file and `engines` version in `package.json`. Note that Vercel does not allow pinning to exact node version so
in the `package.json` file we specify the max patch version while in the `.nvmrc` we specify the max version possible 
for that range because that is what Vercel will be using when building too. 

## Deployment

First, build your app for production:

```sh
bun run build
```

Then run the app in production mode:

```sh
bun start
```

The app is deployed to Vercel. Every push to GitHub triggers a new Vercel deployment. Pushes to `master` branch
are deploying a new live version. Currently, Vercel doesn't support running Remix with custom server (see the docs 
[here](https://vercel.com/docs/frameworks/remix#using-a-custom-server-file)). This means that our custom express server
is used only when running locally. We are still keeping the express server because the plan is to eventually move to
self-hosting.

## Dependencies

Dependency should be added only if the benefits are clear. Avoid adding it for trivial stuff. Any dependency added 
should be inspected and pinned to exact version (`bun add <package_name>@<version> --exact`). For any dependency added
to the client side, be mindful of the bundle size. [Bundlephobia](https://bundlephobia.com/) can be used to check the
total size of the dependency (the actual impact on the app bundle size could be smaller if we are using only some 
elements and the lib supports tree shaking).

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
Pre-commit hook is configured using devenv (see `devenv.nix` file) and it runs `bun run fix:staged` command. To skip the
pre-commit hook use `--no-verify` param with `git commit` command. This can be useful when committing temporary code but
the CI will run the checks again and won't allow any non-conforming code to be commited to `master`.

Lint & formatting configs are defined in `biome.jsonc` file.

## Testing

The idea is to cover key lower level reusable pieces with unit tests and main app flows with e2e Playwright tests. We 
are not aiming for any specific coverage. Use your best judgement. 

Bun is used to run unit tests. To run them use `bun test` or `bun run test`. Colocate the test file next to the piece it 
tests and name the file `<name_of_the_unit_tested>.test.ts(x)`.

E2e tests are written in [Playwright](https://playwright.dev/). In these tests we are mocking Open Secret API so tests
can be run offline, and so we can simulate any desired Open Secret behavior. For some example on how to use the mocking
see the existing tests. E2e tests can be found in top level `e2e` folder. To run them use `bun run test:e2e` (add `--ui`
param to run them in Playwright UI). New e2e test suits should be added to `e2e` folder and named 
`<name_of_the_suite>.spec.ts`.

## CI

Every pull request created will trigger GitHub Actions CI pipeline. The pipeline is running three jobs in parallel. One
that checks code format, lint and types. Another that runs the unit tests and third one that runs e2e tests. If any of
the jobs fail, merging to `master` will not be allowed.