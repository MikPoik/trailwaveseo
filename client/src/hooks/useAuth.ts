import { useUser } from '@stackframe/react';
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  const [, setLocation] = useLocation();
  const stackUser = useUser({ or: 'return-null' });

  // Fetch app-specific user data (credits, subscriptions, etc.)
  const { data: appUser, isLoading: isAppUserLoading, error, refetch } = useQuery({
    queryKey: ["/api/auth/user", stackUser?.id],
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    staleTime: Infinity,
    gcTime: Infinity,
    enabled: !!stackUser,
  });

  const login = () => {
    setLocation('/handler/sign-in');
  };

  const logout = async () => {
    await stackUser?.signOut();
    setLocation('/');
  };

  // Redirect to login if unauthorized
  const requireAuth = () => {
    if (!stackUser) {
      login();
      return false;
    }
    return true;
  };

  // Sync user data from Neon Auth after login
  React.useEffect(() => {
    if (stackUser && !appUser && !isAppUserLoading) {
      // User is authenticated but not in our database yet - sync them
      fetch('/api/auth/sync-user', {
        method: 'POST',
        headers: {
          'x-stack-user-id': stackUser.id,
        },
      })
        .then(() => {
          // Refetch to get the synced user data
          refetch();
        })
        .catch((err) => {
          console.error('Failed to sync user:', err);
        });
    }
  }, [stackUser, appUser, isAppUserLoading, refetch]);

  // Combine Stack user data with app-specific data
  const user = stackUser ? {
    id: stackUser.id,
    email: stackUser.primaryEmail || appUser?.email,
    firstName: stackUser.displayName?.split(' ')[0] || appUser?.firstName,
    lastName: stackUser.displayName?.split(' ')[1] || appUser?.lastName,
    profileImageUrl: stackUser.profileImageUrl || appUser?.profileImageUrl,
    // App-specific fields from database
    pagesAnalyzed: appUser?.pagesAnalyzed,
    pageLimit: appUser?.pageLimit,
    credits: appUser?.credits,
    chatMessagesInPack: appUser?.chatMessagesInPack,
    accountStatus: appUser?.accountStatus,
    stripeCustomerId: appUser?.stripeCustomerId,
  } : null;

  return {
    user,
    isLoading: !stackUser || isAppUserLoading,
    isAuthenticated: !!stackUser,
    error,
    login,
    logout,
    requireAuth,
    refetch
  };
}