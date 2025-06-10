/// <reference types="vite/client" />

// biome-ignore lint/correctness/noUnusedVariables: needed to get type safety for env variables. See https://vite.dev/guide/env-and-mode#intellisense-for-typescript
interface ViteTypeOptions {
  // By adding this line, you can make the type of ImportMetaEnv strict
  // to disallow unknown keys.
  strictImportMetaEnv: unknown;
}

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string | undefined;
  readonly VITE_SUPABASE_ANON_KEY: string | undefined;
  readonly SUPABASE_SERVICE_ROLE_KEY: string | undefined;
  readonly VITE_OPEN_SECRET_API_URL: string | undefined;
  readonly VITE_OPEN_SECRET_CLIENT_ID: string | undefined;
}

// biome-ignore lint/correctness/noUnusedVariables: needed to get type safety for env variables. See https://vite.dev/guide/env-and-mode#intellisense-for-typescript
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
