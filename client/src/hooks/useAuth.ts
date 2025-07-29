import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";

export function useAuth() {
  const [, setLocation] = useLocation();

  const { data: user, isLoading, error, refetch } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    staleTime: Infinity, // Cache indefinitely until manual refetch
    gcTime: Infinity, // Keep in cache indefinitely
    enabled: true,
  });

  const login = () => {
    window.location.href = "/api/login";
  };

  const logout = () => {
    window.location.href = "/api/logout";
  };

  // Redirect to login if unauthorized
  const requireAuth = () => {
    if (!isLoading && !user && !error) {
      login();
      return false;
    }
    return true;
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    error,
    login,
    logout,
    requireAuth,
    refetch
  };
}