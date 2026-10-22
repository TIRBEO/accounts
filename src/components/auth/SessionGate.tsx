import React from 'react';
import { useSession } from '../../hooks/useSession';
import { AuthCardSkeleton } from '../ui/ig-ui';

interface SessionGateProps {
  children: React.ReactNode;
}

/**
 * The signed-in visitor has no screen here any more — App's hand-off effect
 * navigates them to the dashboard the moment the session answers "member".
 * This gate only decides whether the login form may show while that answer is
 * not in yet, and plates the card so the wait is not a blank canvas.
 */
export function SessionGate({ children }: SessionGateProps) {
  const session = useSession();
  // 'unknown' is a probe in flight, not a verdict — the form is never held
  // behind it. Someone already signed in who types a password anyway still gets
  // a straight answer from the API.
  if (session.status === 'unknown' || session.status === 'guest') return <>{children}</>;
  return <AuthCardSkeleton />;
}
