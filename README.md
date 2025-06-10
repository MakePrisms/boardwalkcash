# Agicash

This app is using [Remix](https://remix.run/docs) framework, but it is hosted on a custom [Express](https://expressjs.com/) server. However, currently Express
server is only used when running locally. When deployed to Vercel, Express server is not used.

For auth and storing sensitive data the app is using Open Secret platform. The rest of the data is stored to Postgres
database hosted on Supabase. 

## Getting started

We use [Nix](https://nixos.org/) and [devenv](https://devenv.sh/) to set up the development environment. To start:
1. Install `Nix` (on macOS run `curl -L https://github.com/NixOS/experimental-nix-installer/releases/download/0.27.0/nix-installer.sh | sh -s -- install`
2. Install `devenv` (on macOS run `nix-env -iA devenv -f https://github.com/NixOS/nixpkgs/tarball/nixpkgs-unstable`
3. Install `direnv` (for automatic shell activation):
    * on macOS run `brew install direnv`
    * add the direnv hook to your shell as described [here](https://direnv.net/docs/hook.html)
4. Install the packages with `bun i`

## Development

1. Create `.env` file:

```sh
mv .env.example .env
```

If needed, update the `.env` file with alternative values. This file is git ignored and used only for local development.

2. Start Supabase local stack:

```sh
bun run supabase start
```

3. Run the dev server:

```sh
bun run dev
```

When testing the app on an actual mobile device, you need to connect to the same Wi-Fi as the machine hosting the app 
and access it via local IP or hostname. Unlike localhost or 127.0.0.1 those are not considered as safe context by the
browser so the browser APIs which require safe context won't work. To solve this issue you need to run the app on HTTPS
instead. To run the dev server on HTTPS execute:

```sh
bun run dev --https
```

A self-signed certificate is used for HTTPS. The certificate is managed by devenv automatically. If you need to
regenerate the certificate (for example, if your local IP has changed), reload devenv by executing `direnv reload`
or run the certificate script directly by executing `generate-ssl-cert`. 

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

The database and realtime service are hosted on Supabase platform. Supabase [branching](https://supabase.com/docs/guides/deployment/branching) is used which creates a new
environment for every new feature branch. Additionally, there is a production environment which corresponds to `master`
branch. Every pull request open in GitHub results in a new Supabase environment being created with database migrations
being applied automatically. Every additional push to GitHub applies new migrations (if any) to the Supabase 
environment. Supabase-Vercel integration sets the corresponding env variables in Vercel so that each Vercel preview 
deploy can use this dedicated Supabase environment. When the feature branch is merged, corresponding Supabase
environment is deleted. Merging to `master` branch updates the production environment and applies new db migrations to
the live database if any.

## Dependencies

Dependency should be added only if the benefits are clear. Avoid adding it for trivial stuff. Any dependency added 
should be inspected and pinned to exact version (`bun add <package_name>@<version> --exact`). For any dependency added
to the client side, be mindful of the bundle size. [Bundlephobia](https://bundlephobia.com/) can be used to check the
total size of the dependency (the actual impact on the app bundle size could be smaller if we are using only some 
elements and the lib supports tree shaking).

## Database

Sensitive data is stored in Open Secret platform. The rest of the data is stored to Postgres database hosted on Supabase.
While developing locally local Supabase stack is used. To start it run `bun run supabase start` command. To stop it run
`bun run supabase stop` command. Start command will start the database and realtime service plus other services useful
for development like Supabase Studio. You can use Supabase Studio to inspect the database and run queries. Supabase is
configured in `supabase/config.toml` file.

### Database migrations

Schema changes to the Postgres database should be done using migrations. Migrations are stored in `supabase/migrations`
folder. Always try to make the schema changes in a backwards compatible way.

Database migrations can be done in two ways:
1. Using Supabase Studio. With this approach you can make db changes directly to your local database in the Studio UI
   and then run `bun supabase db diff --file <MIGRATION_NAME>` to create a migration file for the changes.
2. Using `bun supabase migration new <MIGRATION_NAME>`. This command will create a new empty migration file in the 
   `supabase/migrations` folder where you can then write the SQL commands to make the changes. To apply the migration to
   the local database run `bun supabase db push`.

To keep the db typescript types in sync with the database schema run `bun run db:generate-types` command. If you forget
to run this command after making changes to the database, the types will be updated by the pre-commit hook. To skip the
pre-commit hook use `--no-verify` param with `git commit` command. This can be useful when committing temporary code but
the CI will check if the types are up to date and if not will not allow merging to `master`.

To reset local database run `bun supabase db reset`. Note that this will delete any existing local data and run all
migrations on clean db.

Migrations are applied to hosted envs automatically by the Supabase platform. You can track the migrations applied in the 
Supabase dahsboard by going to the branches page and checking the logs for respective branch. If the migration fails for the
feature branch you can reapply it by just resetting the branch. If it fails for the production you will need to resolve the issue and push migrations from your machine by doing:
1. Switch to the production branch by running `git checkout master` and make sure you have the latest version by running `git pull origin master`.
2. Run `bun supabase login` to login to Supabase dahsboard so CLI can access it.
3. Run `bun supabase link` to link to the remote project. For this you will need database password. Ask other team members for current db password (the password can also be reset from the dashboard if needed).
4. Run `bun supabase db push` to apply migrations to the remote database.

Steps 2 and 3 can be skipped if you already logged in and linked the project before.


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
param to run them in Playwright UI). The tests will also start a local Supabase stack, if it is not already running.
New e2e test suits should be added to `e2e` folder and named `<name_of_the_suite>.spec.ts`.

## CI

Every pull request created will trigger GitHub Actions CI pipeline. The pipeline is running three jobs in parallel. One
that checks code format, lint and types. Another that runs the unit tests and third one that runs e2e tests. If any of
the jobs fail, merging to `master` will not be allowed.