-- Real Estate CRM: multi-tenant schema with RLS

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Organizations (brokerage / team)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User profiles (linked to auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TYPE org_role AS ENUM ('admin', 'agent');

CREATE TABLE org_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role org_role NOT NULL DEFAULT 'agent',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, user_id)
);

CREATE TYPE lead_stage AS ENUM ('new', 'contacted', 'qualified', 'closed', 'lost');

CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  stage lead_stage NOT NULL DEFAULT 'new',
  source TEXT,
  tags TEXT[] DEFAULT '{}',
  assigned_agent_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TYPE listing_status AS ENUM ('active', 'pending', 'sold', 'off_market');

CREATE TABLE listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  address TEXT,
  price_display TEXT,
  price_cents BIGINT,
  status listing_status NOT NULL DEFAULT 'active',
  image_url TEXT,
  external_source TEXT,
  external_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, external_source, external_id)
);

CREATE TYPE task_status AS ENUM ('todo', 'inprogress', 'done');

CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status task_status NOT NULL DEFAULT 'todo',
  due_at TIMESTAMPTZ,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
  assigned_agent_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  google_event_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TYPE activity_type AS ENUM ('call', 'email', 'showing', 'note');

CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type activity_type NOT NULL,
  description TEXT,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Google Calendar OAuth tokens per user
CREATE TABLE google_tokens (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expiry TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Async import jobs (CSV / MLS)
CREATE TYPE import_status AS ENUM ('pending', 'processing', 'completed', 'failed');

CREATE TABLE import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  status import_status NOT NULL DEFAULT 'pending',
  total_rows INT DEFAULT 0,
  processed_rows INT DEFAULT 0,
  error_message TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Helper: user's org ids
CREATE OR REPLACE FUNCTION public.user_org_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT org_id FROM org_members WHERE user_id = auth.uid();
$$;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_jobs ENABLE ROW LEVEL SECURITY;

-- Profiles: own row
CREATE POLICY profiles_select ON profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY profiles_update ON profiles FOR UPDATE USING (id = auth.uid());

-- Organizations: members only
CREATE POLICY orgs_select ON organizations FOR SELECT
  USING (id IN (SELECT public.user_org_ids()));

CREATE POLICY orgs_insert ON organizations FOR INSERT
  WITH CHECK (true);

-- Org members
CREATE POLICY org_members_select ON org_members FOR SELECT
  USING (org_id IN (SELECT public.user_org_ids()));

CREATE POLICY org_members_insert ON org_members FOR INSERT
  WITH CHECK (
    org_id IN (SELECT public.user_org_ids())
    OR NOT EXISTS (SELECT 1 FROM org_members om WHERE om.org_id = org_members.org_id)
  );

-- Leads
CREATE POLICY leads_all ON leads FOR ALL
  USING (org_id IN (SELECT public.user_org_ids()))
  WITH CHECK (org_id IN (SELECT public.user_org_ids()));

-- Listings
CREATE POLICY listings_all ON listings FOR ALL
  USING (org_id IN (SELECT public.user_org_ids()))
  WITH CHECK (org_id IN (SELECT public.user_org_ids()));

-- Tasks
CREATE POLICY tasks_all ON tasks FOR ALL
  USING (org_id IN (SELECT public.user_org_ids()))
  WITH CHECK (org_id IN (SELECT public.user_org_ids()));

-- Activities
CREATE POLICY activities_all ON activities FOR ALL
  USING (org_id IN (SELECT public.user_org_ids()))
  WITH CHECK (org_id IN (SELECT public.user_org_ids()));

-- Google tokens: own only
CREATE POLICY google_tokens_own ON google_tokens FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Import jobs
CREATE POLICY import_jobs_all ON import_jobs FOR ALL
  USING (org_id IN (SELECT public.user_org_ids()))
  WITH CHECK (org_id IN (SELECT public.user_org_ids()));

-- Indexes
CREATE INDEX idx_leads_org ON leads(org_id);
CREATE INDEX idx_listings_org ON listings(org_id);
CREATE INDEX idx_tasks_org_status ON tasks(org_id, status);
CREATE INDEX idx_activities_org ON activities(org_id);
