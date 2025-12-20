import { trpc } from '@/lib/trpc';
import { useLocation } from 'wouter';
import { toast } from 'sonner';

/**
 * Custom hook for authentication state and actions
 * Provides user data, loading state, and auth actions
 */
export function useAuth() {
  const [, setLocation] = useLocation();

  // Get current user from tRPC query
  const {
    data: user,
    isLoading,
    error,
    refetch,
  } = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  // Logout mutation
  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      toast.success('Logged out successfully');
      setLocation('/login');
    },
    onError: (error) => {
      toast.error('Logout failed: ' + error.message);
    },
  });

  /**
   * Login function (using REST API since auth is not in tRPC)
   */
  const login = async (email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Refetch user data
      await refetch();

      toast.success('Login successful!');

      // Redirect based on onboarding status
      if (data.user?.onboardingCompleted === false) {
        setLocation('/onboarding');
      } else {
        setLocation('/dashboard');
      }

      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      toast.error(message);
      throw error;
    }
  };

  /**
   * Signup function (using REST API since auth is not in tRPC)
   */
  const signup = async (name: string, email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password }),
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Signup failed');
      }

      // Refetch user data
      await refetch();

      toast.success('Account created successfully!');

      // Redirect to onboarding or dashboard
      if (data.user?.onboardingCompleted === false) {
        setLocation('/onboarding');
      } else {
        setLocation('/dashboard');
      }

      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Signup failed';
      toast.error(message);
      throw error;
    }
  };

  /**
   * Logout function
   */
  const logout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Logout failed');
      }

      // Refetch to clear user data
      await refetch();

      toast.success('Logged out successfully');
      setLocation('/login');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Logout failed';
      toast.error(message);
      throw error;
    }
  };

  return {
    // User data
    user,
    isAuthenticated: !!user,
    isLoading,
    error,

    // Auth actions
    login,
    signup,
    logout,
    refetch,
  };
}
