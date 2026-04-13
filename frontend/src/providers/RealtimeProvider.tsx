import { useEffect, type ReactNode } from "react";
import { useAuth } from "./AuthProvider";
import {
  connectWs,
  disconnectWs,
} from "../services/ws";

type RealtimeProviderProps = {
  children: ReactNode;
};

export function RealtimeProvider({ children }: RealtimeProviderProps) {
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (user) {
      connectWs();
      return;
    }

    disconnectWs();
  }, [isLoading, user]);

  return children;
}
