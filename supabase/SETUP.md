# Tirbeo Accounts - Supabase Database Setup

## Quick Setup (5 minutes)

### Step 1: Open Supabase SQL Editor
1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/_/sql/new)
2. Make sure you're in the correct project

### Step 2: Run the Migration
1. Copy the contents of `migrations/001_create_profiles_tables.sql`
2. Paste it into the SQL Editor
3. Click **Run** to execute

### Step 3: Create Avatars Storage Bucket
1. Go to **Storage** in the left sidebar
2. Click **New Bucket**
3. Enter:
   - Name: `avatars`
   - Public: ✅ (checked)
4. Click **Create Bucket**

### Step 4: Set Up Storage Policies
After creating the bucket, go to **Storage > avatars > Policies** and add:

**Allow Upload (Authenticated)**
```sql
(bucket_id = 'avatars' AND auth.role() = 'authenticated')
```

**Allow Public Read**
```sql
(bucket_id = 'avatars')
```

**Allow User Delete (Own Files)**
```sql
(bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1])
```

### Step 5: Verify Setup
Run this query to verify tables exist:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('profiles', 'username_history');
```

## Database Schema

### profiles table
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key (same as auth.users.id) |
| email | TEXT | User email (unique) |
| first_name | TEXT | First name |
| last_name | TEXT | Last name |
| username | TEXT | Username (unique, lowercase) |
| avatar_url | TEXT | Profile picture URL |
| bio | TEXT | User bio |
| phone | TEXT | Phone number |
| website | TEXT | Website URL |
| location | TEXT | Location |
| gender | TEXT | Gender |
| dob | DATE | Date of birth |
| occupation | TEXT | Job title |
| company | TEXT | Company name |
| role | TEXT | Role at company |
| recovery_email | TEXT | Recovery email |
| marketing_consent | BOOLEAN | Marketing opt-in |
| created_at | TIMESTAMPTZ | Account creation time |
| updated_at | TIMESTAMPTZ | Last update time |

### username_history table
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | References profiles.id |
| username | TEXT | Previously used username |
| changed_at | TIMESTAMPTZ | When username was changed |
| locked_until | TIMESTAMPTZ | When username becomes available again |

## Helper Functions

### Check username availability
```sql
SELECT public.check_username_available('john-doe');
-- Returns: true/false
```

### Generate username suggestions
```sql
SELECT * FROM public.generate_username_suggestions('john');
-- Returns: table with suggestion column
```

### Cleanup old history (run periodically)
```sql
SELECT public.cleanup_username_history();
```

## Row Level Security (RLS)

- **Profiles**: Public read, users can only update their own
- **Username History**: Public read, system can insert/delete
- **Avatars**: Authenticated upload, public read, users can delete own

## Troubleshooting

### "relation already exists" error
The table already exists. You can skip that part or use `CREATE TABLE IF NOT EXISTS`.

### "permission denied" error
Make sure you're running as a superuser or the service_role key.

### Profiles not auto-creating on signup
Check that the trigger `on_auth_user_created` exists:
```sql
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
```
