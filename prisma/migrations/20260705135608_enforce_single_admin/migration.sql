CREATE UNIQUE INDEX IF NOT EXISTS "users_single_admin_idx"
ON "users" ((true))
WHERE "role"::text = 'ADMIN';
