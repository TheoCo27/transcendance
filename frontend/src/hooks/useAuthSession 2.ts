import { useEffect, useState } from "react";
import { getSession, type SafeUser } from "../services/auth";

type UseAuthSessionResult = {
  user: SafeUser | null;
  isLoading: boolean;
  refreshSession: () => Promise<void>;
};

export function useAuthSession(): UseAuthSessionResult {
  const [user, setUser] = useState<SafeUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshSession = async () => {
    setIsLoading(true);

    try {
      const sessionUser = await getSession();
      setUser(sessionUser);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void refreshSession();

    const handleAuthChanged = () => {
      void refreshSession();
    };

    window.addEventListener("auth-changed", handleAuthChanged);
    return () => {
      window.removeEventListener("auth-changed", handleAuthChanged);
    };
  }, []);

  return {
    user,
    isLoading,
    refreshSession,
  };
}
