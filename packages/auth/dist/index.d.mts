import * as react from 'react';
import { ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { Profile, AdminUser, AdminRole } from '@tirbeo/database/types';

type AuthState = {
    user: User | null;
    profile: Profile | null;
    admin: AdminUser | null;
    session: Session | null;
    isLoading: boolean;
    isAdmin: boolean;
    adminRole: AdminRole | null;
    signInWithPassword: (email: string, password: string) => Promise<{
        error: string | null;
    }>;
    signInWithOtp: (email: string) => Promise<{
        error: string | null;
    }>;
    signInWithGoogle: () => Promise<void>;
    signUp: (email: string, password: string, username: string) => Promise<{
        error: string | null;
    }>;
    signOut: () => Promise<void>;
    refreshSession: () => Promise<void>;
};
declare function AuthProvider({ children }: {
    children: ReactNode;
}): react.JSX.Element;
declare function useAuth(): AuthState;

export { AuthProvider, useAuth };
