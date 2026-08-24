-- ═══════════════════════════════════════════════════════════════
-- AVATARS STORAGE BUCKET
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

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Avatar view policy" ON storage.objects;
DROP POLICY IF EXISTS "Avatar upload policy" ON storage.objects;
DROP POLICY IF EXISTS "Avatar update policy" ON storage.objects;
DROP POLICY IF EXISTS "Avatar delete policy" ON storage.objects;

-- Storage policies
CREATE POLICY "Avatar view policy"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Avatar upload policy"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
  );

CREATE POLICY "Avatar update policy"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Avatar delete policy"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ═══════════════════════════════════════════════════════════════
-- HELPER FUNCTIONS
-- ═══════════════════════════════════════════════════════════════

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS public.check_username_available(TEXT);
DROP FUNCTION IF EXISTS public.generate_username_suggestions(TEXT, INT);
DROP FUNCTION IF EXISTS public.cleanup_username_history();

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
