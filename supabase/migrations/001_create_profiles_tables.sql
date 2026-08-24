-- ═══════════════════════════════════════════════════════════════
-- Tirbeo Accounts - Database Schema
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql/new
-- ═══════════════════════════════════════════════════════════════

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ═══════════════════════════════════════════════════════════════
-- 1. PROFILES TABLE
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.profiles (
    -- Primary key (same as auth.users.id)
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Authentication
    email TEXT UNIQUE NOT NULL,
    
    -- Name
    first_name TEXT NOT NULL DEFAULT '',
    last_name TEXT NOT NULL DEFAULT '',
    
    -- Username (unique, lowercase)
    username TEXT UNIQUE NOT NULL,
    
    -- Profile information
    avatar_url TEXT,
    bio TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    website TEXT DEFAULT '',
    location TEXT DEFAULT '',
    
    -- Demographics
    gender TEXT DEFAULT '',
    dob DATE,
    
    -- Professional info
    occupation TEXT DEFAULT '',
    company TEXT DEFAULT '',
    role TEXT DEFAULT '',
    
    -- Recovery
    recovery_email TEXT DEFAULT '',
    
    -- Preferences
    marketing_consent BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comments for documentation
COMMENT ON TABLE public.profiles IS 'User profile information linked to auth.users';
COMMENT ON COLUMN public.profiles.id IS 'References auth.users.id';
COMMENT ON COLUMN public.profiles.username IS 'Unique username (lowercase, 3-30 chars)';
COMMENT ON COLUMN public.profiles.avatar_url IS 'URL to profile picture in Supabase storage';

-- Create index for username lookups
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- ═══════════════════════════════════════════════════════════════
-- 2. USERNAME HISTORY TABLE
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.username_history (
    -- Primary key
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    
    -- User reference
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    
    -- The username that was used
    username TEXT NOT NULL,
    
    -- When it was changed
    changed_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- When this username becomes available again (30 days default)
    locked_until TIMESTAMPTZ NOT NULL
);

-- Add comments
COMMENT ON TABLE public.username_history IS 'Tracks previously used usernames to prevent reuse';
COMMENT ON COLUMN public.username_history.locked_until IS 'Username is locked until this date (default 30 days)';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_username_history_user ON public.username_history(user_id);
CREATE INDEX IF NOT EXISTS idx_username_history_username ON public.username_history(username);
CREATE INDEX IF NOT EXISTS idx_username_history_locked ON public.username_history(locked_until);

-- ═══════════════════════════════════════════════════════════════
-- 3. AVATARS STORAGE BUCKET
-- ═══════════════════════════════════════════════════════════════
-- Note: Create the 'avatars' bucket in Supabase Dashboard > Storage
-- Or run this if using Supabase CLI:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

-- ═══════════════════════════════════════════════════════════════
-- 4. FUNCTIONS & TRIGGERS
-- ═══════════════════════════════════════════════════════════════

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, username, first_name, last_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'last_name', '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

-- ═══════════════════════════════════════════════════════════════
-- 5. ROW LEVEL SECURITY (RLS)
-- ═══════════════════════════════════════════════════════════════

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.username_history ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone"
    ON public.profiles FOR SELECT
    USING (true);

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Username history policies
CREATE POLICY "Username history is viewable by everyone"
    ON public.username_history FOR SELECT
    USING (true);

CREATE POLICY "System can insert username history"
    ON public.username_history FOR INSERT
    WITH CHECK (true);

CREATE POLICY "System can delete old username history"
    ON public.username_history FOR DELETE
    USING (true);

-- ═══════════════════════════════════════════════════════════════
-- 6. HELPER FUNCTIONS
-- ═══════════════════════════════════════════════════════════════

-- Function to check username availability
CREATE OR REPLACE FUNCTION public.check_username_available(username_to_check TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    is_taken BOOLEAN;
    is_recently_used BOOLEAN;
BEGIN
    -- Check if currently in use
    SELECT EXISTS(
        SELECT 1 FROM public.profiles 
        WHERE LOWER(username) = LOWER(username_to_check)
    ) INTO is_taken;
    
    -- Check if recently used (locked)
    SELECT EXISTS(
        SELECT 1 FROM public.username_history 
        WHERE LOWER(username) = LOWER(username_to_check)
        AND locked_until > NOW()
    ) INTO is_recently_used;
    
    RETURN NOT is_taken AND NOT is_recently_used;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate username suggestions
CREATE OR REPLACE FUNCTION public.generate_username_suggestions(
    base_username TEXT,
    max_suggestions INT DEFAULT 5
)
RETURNS TABLE(suggestion TEXT) AS $$
DECLARE
    counter INT := 1;
    random_nums INT[] := ARRAY[42, 123, 2024, 100, 777, 888, 999, 256, 512, 1024];
    rand_idx INT;
BEGIN
    -- Try number suffixes
    WHILE counter <= max_suggestions AND counter <= 10 LOOP
        IF public.check_username_available(base_username || counter) THEN
            suggestion := base_username || counter;
            RETURN NEXT;
        END IF;
        counter := counter + 1;
    END LOOP;
    
    -- Try random numbers
    FOREACH rand_idx IN ARRAY random_nums LOOP
        IF counter > max_suggestions THEN
            EXIT;
        END IF;
        IF public.check_username_available(base_username || rand_idx) THEN
            suggestion := base_username || rand_idx;
            RETURN NEXT;
            counter := counter + 1;
        END IF;
    END LOOP;
    
    -- Try underscore variants
    IF counter <= max_suggestions AND public.check_username_available(base_username || '_') THEN
        suggestion := base_username || '_';
        RETURN NEXT;
        counter := counter + 1;
    END IF;
    
    IF counter <= max_suggestions AND public.check_username_available('_' || base_username) THEN
        suggestion := '_' || base_username;
        RETURN NEXT;
    END IF;
    
    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════
-- 7. CLEANUP FUNCTION (Run periodically)
-- ═══════════════════════════════════════════════════════════════

-- Function to cleanup expired username history entries
CREATE OR REPLACE FUNCTION public.cleanup_username_history()
RETURNS void AS $$
BEGIN
    DELETE FROM public.username_history
    WHERE locked_until < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════
-- 8. STORAGE POLICIES (Run after creating avatars bucket)
-- ═══════════════════════════════════════════════════════════════

-- These policies assume you've created an 'avatars' bucket in Storage
-- Uncomment and run after creating the bucket:

/*
-- Allow anyone to upload avatars (bucket is public for reading)
CREATE POLICY "Avatar upload policy"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'avatars'
    );

-- Allow anyone to view avatars
CREATE POLICY "Avatar view policy"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'avatars');

-- Allow users to update their own avatars
CREATE POLICY "Avatar update policy"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'avatars'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Allow users to delete their own avatars
CREATE POLICY "Avatar delete policy"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'avatars'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );
*/

-- ═══════════════════════════════════════════════════════════════
-- DONE! Tables are ready.
-- ═══════════════════════════════════════════════════════════════
