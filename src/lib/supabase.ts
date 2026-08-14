import { createClient } from '@supabase/supabase-js';

// Use environment variables with fallback
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://lnmtfekuuhsscnykxwxw.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxubXRmZWt1dWhzc2NueWt4d3h3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg2NjI4MDAsImV4cCI6MjA1NDIzODgwMH0.JqBvOY7Vf9V7a9e8r3j6k5x2m1n4p0q8w7y3t6u9i2o';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ═══ AVATAR STORAGE ═══
// Avatar uploads use Supabase Storage. All account/auth logic lives in the
// Tirbeo API (see ./api.ts) so the platform shares one session system.

/**
 * Upload avatar to Supabase Storage
 */
export const uploadAvatar = async (
  userId: string,
  file: File | string
): Promise<{ url: string | null; error?: string }> => {
  try {
    const fileName = `${userId}/avatar-${Date.now()}.jpg`;
    
    let uploadData: File | Blob;
    
    if (typeof file === 'string') {
      // Convert base64 data URL to Blob
      const response = await fetch(file);
      uploadData = await response.blob();
    } else {
      uploadData = file;
    }
    
    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, uploadData, {
        cacheControl: '3600',
        upsert: true,
      });
    
    if (uploadError) {
      console.error('Upload error:', uploadError);
      return { url: null, error: 'Failed to upload avatar' };
    }
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);
    
    return { url: urlData.publicUrl };
  } catch (err) {
    console.error('uploadAvatar error:', err);
    return { url: null, error: 'Failed to upload avatar' };
  }
};

/**
 * Delete avatar from Supabase Storage
 */
export const deleteAvatar = async (
  userId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // List files in user's folder
    const { data: files, error: listError } = await supabase.storage
      .from('avatars')
      .list(userId);
    
    if (listError || !files || files.length === 0) {
      return { success: true };
    }
    
    // Delete all files in user's folder
    const filePaths = files.map(file => `${userId}/${file.name}`);
    const { error: deleteError } = await supabase.storage
      .from('avatars')
      .remove(filePaths);
    
    if (deleteError) {
      console.error('Delete error:', deleteError);
      return { success: false, error: 'Failed to delete avatar' };
    }
    
    return { success: true };
  } catch (err) {
    console.error('deleteAvatar error:', err);
    return { success: false, error: 'Failed to delete avatar' };
  }
};

/**
 * Get avatar public URL
 */
export const getAvatarUrl = (
  userId: string,
  fileName?: string
): string => {
  const path = fileName ? `${userId}/${fileName}` : `${userId}/avatar.jpg`;
  const { data } = supabase.storage
    .from('avatars')
    .getPublicUrl(path);
  return data.publicUrl;
};

// ═══ CLIENT-SIDE TOTP (2FA SETUP) ═══
// The signup 2FA wizard generates and verifies the TOTP secret client-side;
// the verified secret is stored server-side via the API signup endpoint.

const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let bits = '';
  for (const byte of bytes) {
    bits += byte.toString(2).padStart(8, '0');
  }
  let result = '';
  for (let i = 0; i < bits.length; i += 5) {
    const chunk = bits.slice(i, i + 5).padEnd(5, '0');
    result += BASE32_CHARS[parseInt(chunk, 2)];
  }
  return result;
}

function base32Decode(str: string): Uint8Array {
  let bits = '';
  for (const char of str.toUpperCase()) {
    const val = BASE32_CHARS.indexOf(char);
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, '0');
  }
  const bytes = new Uint8Array(Math.floor(bits.length / 8));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(bits.slice(i * 8, i * 8 + 8), 2);
  }
  return bytes;
}

/**
 * Generate a random TOTP secret (160 bits = 20 bytes)
 */
export function generateTOTPSecret(): string {
  const buffer = new ArrayBuffer(20);
  const view = new Uint8Array(buffer);
  crypto.getRandomValues(view);
  return base32Encode(buffer);
}

/**
 * Generate TOTP URI for QR code (otpauth://totp/...)
 */
export function generateTOTPUri(secret: string, email: string, issuer: string = 'Tirbeo'): string {
  const encodedIssuer = encodeURIComponent(issuer);
  const encodedEmail = encodeURIComponent(email);
  return `otpauth://totp/${encodedIssuer}:${encodedEmail}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;
}

/**
 * Compute HMAC-SHA1 using Web Crypto API
 */
async function hmacSha1(key: ArrayBuffer, message: ArrayBuffer): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw', key, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']
  );
  return crypto.subtle.sign('HMAC', cryptoKey, message);
}

/**
 * Generate TOTP code for a given time step
 */
async function generateTOTPCode(secret: string, timeStep: number): Promise<string> {
  const secretBytes = base32Decode(secret);
  
  // Create 8-byte time counter (big-endian)
  const timeBuffer = new ArrayBuffer(8);
  const timeView = new DataView(timeBuffer);
  timeView.setUint32(4, timeStep, false); // Big-endian
  
  // Compute HMAC-SHA1
  const hmac = await hmacSha1(secretBytes.buffer, timeBuffer);
  
  // Dynamic truncation
  const hmacArray = new Uint8Array(hmac);
  const offset = hmacArray[19] & 0x0f;
  const code = (
    ((hmacArray[offset] & 0x7f) << 24) |
    ((hmacArray[offset + 1] & 0xff) << 16) |
    ((hmacArray[offset + 2] & 0xff) << 8) |
    (hmacArray[offset + 3] & 0xff)
  ) % 1000000;
  
  return code.toString().padStart(6, '0');
}

/**
 * Verify a TOTP code (checks current and adjacent time windows)
 */
export async function verifyTOTPCode(secret: string, code: string, window: number = 1): Promise<boolean> {
  const currentTime = Math.floor(Date.now() / 1000);
  const timeStep = Math.floor(currentTime / 30);
  
  for (let i = -window; i <= window; i++) {
    const expectedCode = await generateTOTPCode(secret, timeStep + i);
    if (code === expectedCode) {
      return true;
    }
  }
  return false;
}
