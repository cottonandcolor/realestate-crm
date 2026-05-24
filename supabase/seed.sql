-- Optional: run after migration for a test org (requires existing auth user UUID)
-- Replace :user_id and run in Supabase SQL editor

-- INSERT INTO organizations (name) VALUES ('Demo Brokerage') RETURNING id;
-- INSERT INTO org_members (org_id, user_id, role) VALUES ('<org_id>', '<user_id>', 'admin');
