const fs = require('fs');
const basePath = 'D:\\Web1\\init.sql';
const outPath = 'D:\\Web1\\techtra_full_data_for_web.sql';

let s = fs.readFileSync(basePath, 'utf8');

// Remove trailing COMMIT only at the very end
s = s.replace(/\n\s*COMMIT\s*;\s*$/i, '\n');

// Add role creation at the very beginning (before first grant)
const roleBlock = `DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role NOLOGIN; END IF;
END;
$$;

`;
const firstGrant = s.indexOf('grant usage on schema public');
if (firstGrant >= 0) s = s.slice(0, firstGrant) + roleBlock + s.slice(firstGrant);

// Append extra seed data
let extra = fs.readFileSync('D:\\Web1\\seed_extra.sql', 'utf8');
s += '\n\n' + extra;

// Normalize line endings and add BEGIN/COMMIT wrapper
s = s.replace(/\r\n/g, '\n');
s = s.replace(/^/g, 'BEGIN;\n\n');

fs.writeFileSync(outPath, s);
console.log('Generated', outPath, (fs.statSync(outPath).size / 1024).toFixed(2), 'KB');
