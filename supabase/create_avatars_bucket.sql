-- ═══════════════════════════════════════════════════════════════
-- AVATARS STORAGE BUCKET
-- Run this in Supabase SQL Editor
-- https://supabase.com/dashboard/project/lnmtfekuuhsscnykxwxw/sql/new
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

-- ═══════════════════════════════════════════════════════════════
-- STORAGE POLICIES
-- ═══════════════════════════════════════════════════════════════

-- Enable RLS on storage.objects (usually already enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 1. Allow anyone to view avatars (public bucket)
CREATE POLICY "Avatar view policy"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- 2. Allow anyone to upload avatars (bucket is public for reading, so
--    restricting uploads to authenticated users only blocks OAuth users
--    who sign in via the Tirbeo API rather than Supabase Auth.)
CREATE POLICY "Avatar upload policy"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
  );

-- 3. Allow users to update their own avatars
CREATE POLICY "Avatar update policy"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- 4. Allow users to delete their own avatars
CREATE POLICY "Avatar delete policy"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ═══════════════════════════════════════════════════════════════
-- DONE! Avatars bucket is ready.
-- ═══════════════════════════════════════════════════════════════
