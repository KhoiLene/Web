-- Pre-init script: tạo role mà init.sql reference.
-- Phải đặt TRƯỚC init.sql trong alphabetical order
-- (file name `00-roles.sql` < `init.sql`).
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;
GRANT anon TO postgres;
GRANT authenticated TO postgres;
GRANT service_role TO postgres;