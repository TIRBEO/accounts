-- ═══════════════════════════════════════════════════════════════
-- Tirbeo Custom Auth System - Database Schema
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ═══════════════════════════════════════════════════════════════
-- 1. USERS TABLE (replaces auth.users)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.users (
    -- Primary key (TEXT to match existing schema)
    id TEXT PRIMARY KEY DEFAULT (gen_random_uuid())::text,
    
    -- Authentication
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL, -- bcrypt hash
    
    -- Profile
    first_name TEXT NOT NULL DEFAULT '',
    last_name TEXT NOT NULL DEFAULT '',
    username TEXT UNIQUE NOT NULL,
    
    -- Status
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login_at TIMESTAMPTZ
);

COMMENT ON TABLE public.users IS 'Custom user accounts (replaces Supabase Auth)';
COMMENT ON COLUMN public.users.password_hash IS 'bcrypt hashed password';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);

-- ═══════════════════════════════════════════════════════════════
-- 2. USER PROFILES TABLE
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.user_profiles (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- User reference (TEXT to match users.id)
    user_id TEXT UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    
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

COMMENT ON TABLE public.user_profiles IS 'Extended user profile information';

-- ═══════════════════════════════════════════════════════════════
-- 3. EMAIL VERIFICATION CODES TABLE
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.email_verification_codes (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- User reference (TEXT to match users.id)
    user_id TEXT REFERENCES public.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    
    -- Verification code
    code TEXT NOT NULL, -- 6-digit code
    
    -- Purpose (signup, login, reset, etc.)
    purpose TEXT NOT NULL DEFAULT 'signup', -- 'signup', 'login', 'reset_password', 'change_email'
    
    -- Status
    is_used BOOLEAN DEFAULT FALSE,
    
    -- Expiry (codes expire after 10 minutes)
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '10 minutes'),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.email_verification_codes IS 'Email verification OTP codes';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_verification_email ON public.email_verification_codes(email);
CREATE INDEX IF NOT EXISTS idx_verification_code ON public.email_verification_codes(code);
CREATE INDEX IF NOT EXISTS idx_verification_expires ON public.email_verification_codes(expires_at);

-- ═══════════════════════════════════════════════════════════════
-- 4. SESSIONS TABLE
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.sessions (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- User reference
    user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    
    -- Session token
    token TEXT UNIQUE NOT NULL,
    
    -- Device info
    device_info TEXT,
    ip_address INET,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Expiry (sessions expire after 30 days)
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_active_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.sessions IS 'User login sessions';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sessions_user ON public.sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON public.sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON public.sessions(expires_at);

-- ═══════════════════════════════════════════════════════════════
-- 5. PASSWORD RESET TOKENS TABLE
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- User reference
    user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    
    -- Reset token
    token TEXT UNIQUE NOT NULL,
    
    -- Status
    is_used BOOLEAN DEFAULT FALSE,
    
    -- Expiry (tokens expire after 1 hour)
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 hour'),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.password_reset_tokens IS 'Password reset tokens';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_reset_token ON public.password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_reset_user ON public.password_reset_tokens(user_id);

-- ═══════════════════════════════════════════════════════════════
-- 6. USERNAME HISTORY TABLE
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.username_history (
    -- Primary key
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    
    -- User reference
    user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    
    -- The username that was used
    username TEXT NOT NULL,
    
    -- When it was changed
    changed_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- When this username becomes available again (30 days default)
    locked_until TIMESTAMPTZ NOT NULL
);

COMMENT ON TABLE public.username_history IS 'Tracks previously used usernames';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_username_history_user ON public.username_history(user_id);
CREATE INDEX IF NOT EXISTS idx_username_history_username ON public.username_history(username);

-- ═══════════════════════════════════════════════════════════════
-- 7. FUNCTIONS
-- ═══════════════════════════════════════════════════════════════

-- Function to hash password
CREATE OR REPLACE FUNCTION public.hash_password(password TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN crypt(password, gen_salt('bf', 10));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to verify password
CREATE OR REPLACE FUNCTION public.verify_password(password TEXT, hash TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN crypt(password, hash) = hash;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate session token
CREATE OR REPLACE FUNCTION public.generate_session_token()
RETURNS TEXT AS $$
BEGIN
    RETURN encode(gen_random_bytes(32), 'hex');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate verification code
CREATE OR REPLACE FUNCTION public.generate_verification_code()
RETURNS TEXT AS $$
BEGIN
    RETURN LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup expired codes
CREATE OR REPLACE FUNCTION public.cleanup_expired_codes()
RETURNS void AS $$
BEGIN
    DELETE FROM public.email_verification_codes
    WHERE expires_at < NOW() OR is_used = TRUE;
    
    DELETE FROM public.password_reset_tokens
    WHERE expires_at < NOW() OR is_used = TRUE;
    
    DELETE FROM public.sessions
    WHERE expires_at < NOW() OR is_active = FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

-- ═══════════════════════════════════════════════════════════════
-- 8. ROW LEVEL SECURITY (RLS)
-- ═══════════════════════════════════════════════════════════════

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_verification_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.username_history ENABLE ROW LEVEL SECURITY;

-- Users policies (public can read basic info, users can update own)
CREATE POLICY "Public user info" ON public.users FOR SELECT
    USING (true);

CREATE POLICY "Users update self" ON public.users FOR UPDATE
    USING (id = (current_setting('request.jwt.claims', true)::json->>'user_id'));

-- Profiles policies
CREATE POLICY "Public profiles" ON public.user_profiles FOR SELECT
    USING (true);

CREATE POLICY "Users update own profile" ON public.user_profiles FOR UPDATE
    USING (user_id = (current_setting('request.jwt.claims', true)::json->>'user_id'));

-- Verification codes (service role only)
CREATE POLICY "Service manages codes" ON public.email_verification_codes FOR ALL
    USING (true);

-- Sessions (service role only)
CREATE POLICY "Service manages sessions" ON public.sessions FOR ALL
    USING (true);

-- Password reset (service role only)
CREATE POLICY "Service manages resets" ON public.password_reset_tokens FOR ALL
    USING (true);

-- Username history (public read, service write)
CREATE POLICY "Public username history" ON public.username_history FOR SELECT
    USING (true);

CREATE POLICY "Service manages history" ON public.username_history FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Service deletes old history" ON public.username_history FOR DELETE
    USING (true);

-- ═══════════════════════════════════════════════════════════════
-- 9. INITIAL DATA
-- ═══════════════════════════════════════════════════════════════

-- Create a default admin user (password: admin123)
-- In production, change this password immediately!
INSERT INTO public.users (email, password_hash, name, username, is_verified)
VALUES (
    'admin@tirbeo.com',
    public.hash_password('admin123'),
    'Admin User',
    'admin',
    true
)
ON CONFLICT (email) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- 10. AVATARS STORAGE BUCKET
-- ═══════════════════════════════════════════════════════════════

-- Create the avatars bucket (public for reading)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880,  -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

-- Storage policies
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view avatars
CREATE POLICY "Avatar view policy"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- Allow anyone to upload avatars (bucket is public for reading)
CREATE POLICY "Avatar upload policy"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
  );

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

-- ═══════════════════════════════════════════════════════════════
-- 11. HELPER FUNCTIONS
-- ═══════════════════════════════════════════════════════════════

-- Function to check username availability
CREATE OR REPLACE FUNCTION public.check_username_available(username_to_check TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    is_taken BOOLEAN;
    is_recently_used BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM public.users 
        WHERE LOWER(username) = LOWER(username_to_check)
    ) INTO is_taken;
    
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
BEGIN
    WHILE counter <= max_suggestions AND counter <= 10 LOOP
        IF public.check_username_available(base_username || counter::TEXT) THEN
            suggestion := base_username || counter::TEXT;
            RETURN NEXT;
        END IF;
        counter := counter + 1;
    END LOOP;
    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup expired username history entries
CREATE OR REPLACE FUNCTION public.cleanup_username_history()
RETURNS void AS $$
BEGIN
    DELETE FROM public.username_history
    WHERE locked_until < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════
-- DONE! All tables and functions are ready.
-- ═══════════════════════════════════════════════════════════════
