-- ═══════════════════════════════════════════════════════════════
-- USERNAME HISTORY TABLE
-- Run this in Supabase SQL Editor
-- https://supabase.com/dashboard/project/lnmtfekuuhsscnykxwxw/sql/new
-- ═══════════════════════════════════════════════════════════════

-- Create the username_history table
CREATE TABLE IF NOT EXISTS public.username_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- User reference (uses custom users table, not auth.users)
    user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    
    -- The username that was used
    username TEXT NOT NULL,
    
    -- When it was changed
    changed_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- When this username becomes available again (30 days default)
    locked_until TIMESTAMPTZ NOT NULL
);

-- Add comments for documentation
COMMENT ON TABLE public.username_history IS 'Tracks previously used usernames to prevent reuse for 30 days';
COMMENT ON COLUMN public.username_history.user_id IS 'References the custom users.id table';
COMMENT ON COLUMN public.username_history.locked_until IS 'Username is locked until this date (default 30 days)';

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_username_history_user_id ON public.username_history(user_id);
CREATE INDEX IF NOT EXISTS idx_username_history_username ON public.username_history(username);
CREATE INDEX IF NOT EXISTS idx_username_history_locked_until ON public.username_history(locked_until);

-- Composite index for availability check query
CREATE INDEX IF NOT EXISTS idx_username_history_username_locked 
    ON public.username_history(username, locked_until);

-- ═══════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS)
-- ═══════════════════════════════════════════════════════════════

-- Enable RLS
ALTER TABLE public.username_history ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read username history (for availability checks)
CREATE POLICY "Public can read username history"
    ON public.username_history FOR SELECT
    USING (true);

-- Allow authenticated users to insert (for recording changes)
CREATE POLICY "Authenticated users can insert username history"
    ON public.username_history FOR INSERT
    WITH CHECK (true);

-- Allow system to delete old entries
CREATE POLICY "System can delete old username history"
    ON public.username_history FOR DELETE
    USING (true);

-- ═══════════════════════════════════════════════════════════════
-- HELPER FUNCTION: Check Username Availability
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.check_username_available(username_to_check TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    is_taken BOOLEAN;
    is_recently_used BOOLEAN;
BEGIN
    -- Check if currently in use
    SELECT EXISTS(
        SELECT 1 FROM public.users 
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

-- ═══════════════════════════════════════════════════════════════
-- HELPER FUNCTION: Generate Username Suggestions
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.generate_username_suggestions(
    base_username TEXT,
    max_suggestions INT DEFAULT 5
)
RETURNS TABLE(suggestion TEXT) AS $$
DECLARE
    counter INT := 1;
BEGIN
    -- Try number suffixes (1, 2, 3, ...)
    WHILE counter <= max_suggestions AND counter <= 10 LOOP
        IF public.check_username_available(base_username || counter::TEXT) THEN
            suggestion := base_username || counter::TEXT;
            RETURN NEXT;
        END IF;
        counter := counter + 1;
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
-- CLEANUP FUNCTION (Run periodically via pg_cron or manually)
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.cleanup_username_history()
RETURNS void AS $$
BEGIN
    DELETE FROM public.username_history
    WHERE locked_until < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════
-- DONE! Table and functions are ready.
-- ═══════════════════════════════════════════════════════════════
