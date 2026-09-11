import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

function dataUrlToBlob(dataUrl: string): Blob {
  const headerMatch = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (headerMatch) {
    const mime = headerMatch[1];
    const raw = atob(headerMatch[2]);
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  }
  const raw = atob(dataUrl);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return new Blob([bytes], { type: 'image/jpeg' });
}

export const uploadAvatar = async (
  userId: string,
  file: File | string,
  credentials?: { email: string; password: string },
): Promise<{ url: string | null; error?: string }> => {
  try {
    const fileName = `${userId}/avatar-${Date.now()}.jpg`;
    const uploadData: File | Blob = typeof file === 'string' ? dataUrlToBlob(file) : file;

    let { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, uploadData, { cacheControl: '3600', upsert: true });

    if (uploadError && credentials) {
      const { error: signInErr } = await supabase.auth.signInWithPassword(credentials);
      if (!signInErr) {
        ({ error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, uploadData, { cacheControl: '3600', upsert: true }));
      }
    }

    if (uploadError) {
      console.error('Avatar upload error:', uploadError);
      return { url: null, error: uploadError.message || 'Failed to upload avatar' };
    }

    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
    return { url: urlData.publicUrl };
  } catch (err) {
    console.error('uploadAvatar error:', err);
    return { url: null, error: 'Failed to upload avatar' };
  }
};
