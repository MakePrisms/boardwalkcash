create schema if not exists "wallet";

-- Manually added. Based on https://supabase.com/docs/guides/api/using-custom-schemas
GRANT USAGE ON SCHEMA wallet TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA wallet TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA wallet TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA wallet TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA wallet GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA wallet GRANT ALL ON ROUTINES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA wallet GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;