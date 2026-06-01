'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useUser } from '@/firebase';

/**
 * Routes that don't require an authenticated session.
 * Anything not listed here will bounce a logged-out visitor back to '/' (the login page).
 */
const PUBLIC_ROUTES = new Set<string>(['/']);
const PUBLIC_PREFIXES = ['/rulebook', '/roadmap', '/arcade'];

function isPublicRoute(pathname: string): boolean {
  if (PUBLIC_ROUTES.has(pathname)) return true;
  return PUBLIC_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

interface AuthGuardProps {
  children: React.ReactNode;
}

/**
 * Wraps the entire app. As soon as Firebase Auth confirms there's no signed-in user,
 * we route every protected page back to the login screen. While Firebase is still
 * resolving the initial auth state we render a loading spinner instead of flashing
 * the protected content.
 */
export default function AuthGuard({ children }: AuthGuardProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isUserLoading } = useUser();

  const isPublic = isPublicRoute(pathname);
  const shouldRedirect = !isUserLoading && !user && !isPublic;

  useEffect(() => {
    if (shouldRedirect) {
      router.replace('/');
    }
  }, [shouldRedirect, router]);

  // Don't render a protected page while we know the user is logged out — even for a
  // single frame. That would let the page mount, fire its own auth-aware queries,
  // and trigger errors before the redirect lands.
  if (shouldRedirect) {
    return (
      <div className="flex min-h-screen w-screen items-center justify-center bg-black">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}
