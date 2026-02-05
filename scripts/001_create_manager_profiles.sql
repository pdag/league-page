-- Manager profiles table for storing self-editable manager information
-- Uses sleeper_user_id as the primary key (the Sleeper user ID)
-- Verification is done by checking a code in the user's Sleeper bio

CREATE TABLE IF NOT EXISTS public.manager_profiles (
  sleeper_user_id TEXT PRIMARY KEY,
  name TEXT,
  location TEXT,
  bio TEXT,
  photo_url TEXT,
  fantasy_start INTEGER,
  favorite_team TEXT,
  mode TEXT CHECK (mode IN ('Win Now', 'Dynasty', 'Rebuild')),
  rival_name TEXT,
  rival_roster_id INTEGER,
  rival_image TEXT,
  favorite_player INTEGER,
  value_position TEXT,
  rookie_or_vets TEXT CHECK (rookie_or_vets IN ('Rookies', 'Vets')),
  philosophy TEXT,
  trading_scale INTEGER CHECK (trading_scale >= 1 AND trading_scale <= 10),
  preferred_contact TEXT,
  verification_code TEXT,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.manager_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read manager profiles (public league info)
CREATE POLICY "manager_profiles_select_all" ON public.manager_profiles
  FOR SELECT
  USING (true);

-- Policy: Verified managers can update their own profile
-- (verification is handled at the application level via Sleeper bio check)
CREATE POLICY "manager_profiles_insert_all" ON public.manager_profiles
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "manager_profiles_update_all" ON public.manager_profiles
  FOR UPDATE
  USING (true);

-- Create an index on sleeper_user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_manager_profiles_sleeper_user_id 
  ON public.manager_profiles(sleeper_user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on row update
DROP TRIGGER IF EXISTS update_manager_profiles_updated_at ON public.manager_profiles;
CREATE TRIGGER update_manager_profiles_updated_at
  BEFORE UPDATE ON public.manager_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
