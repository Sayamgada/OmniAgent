import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { ConnectN8nModal } from "../components/n8n/ConnectN8nModal";
import { setN8nGateHandler } from "../lib/agentsApi";
import { getN8nStatus, type N8nStatus } from "../lib/api/n8n";
import { useAuth } from "./AuthContext";

type N8nContextValue = {
  /** null until the first load finishes (or when logged out). */
  status: N8nStatus | null;
  loading: boolean;
  /** Bumps whenever the connection is connected, changed or disconnected. Pages that
   *  list integrations/agents include it in their load effect so stale flags refresh. */
  version: number;
  refresh: () => Promise<void>;
  /** Opens the connect modal. Resolves true once connected, false if dismissed. */
  requestConnection: () => Promise<boolean>;
  /** For callers that changed the connection themselves (e.g. disconnect). */
  applyStatus: (status: N8nStatus) => void;
};

const N8nContext = createContext<N8nContextValue | null>(null);

export function N8nProvider({ children }: { children: ReactNode }) {
  const { token, isLoggedIn } = useAuth();
  const [status, setStatus] = useState<N8nStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [version, setVersion] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const pending = useRef<{
    promise: Promise<boolean>;
    resolve: (ok: boolean) => void;
  } | null>(null);

  const refresh = useCallback(async () => {
    if (!token) {
      setStatus(null);
      return;
    }
    setLoading(true);
    try {
      setStatus(await getN8nStatus(token));
    } catch {
      // Keep whatever we had: pages still work, and the 409 gate covers a missing connection.
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const settle = useCallback((ok: boolean) => {
    const p = pending.current;
    pending.current = null;
    p?.resolve(ok);
  }, []);

  // One shared prompt: asking again while the modal is open returns the same promise.
  const requestConnection = useCallback((): Promise<boolean> => {
    if (pending.current) return pending.current.promise;
    let resolve!: (ok: boolean) => void;
    const promise = new Promise<boolean>((r) => {
      resolve = r;
    });
    pending.current = { promise, resolve };
    setModalOpen(true);
    return promise;
  }, []);

  const applyStatus = useCallback((next: N8nStatus) => {
    setStatus(next);
    setVersion((v) => v + 1);
  }, []);

  const handleConnected = useCallback(
    (next: N8nStatus) => {
      applyStatus(next);
      setModalOpen(false);
      settle(true);
    },
    [applyStatus, settle],
  );

  const handleOpenChange = useCallback(
    (open: boolean) => {
      setModalOpen(open);
      if (!open) settle(false); // no-op if handleConnected already settled
    },
    [settle],
  );

  // Any request the backend refuses with 409 n8n_not_configured opens the modal and,
  // once connected, is retried automatically (see request() in agentsApi.ts).
  useEffect(() => {
    if (!isLoggedIn) {
      setModalOpen(false);
      settle(false);
      return;
    }
    setN8nGateHandler(requestConnection);
    return () => setN8nGateHandler(null);
  }, [isLoggedIn, requestConnection, settle]);

  const value = useMemo(
    () => ({
      status,
      loading,
      version,
      refresh,
      requestConnection,
      applyStatus,
    }),
    [status, loading, version, refresh, requestConnection, applyStatus],
  );

  return (
    <N8nContext.Provider value={value}>
      {children}
      <ConnectN8nModal
        open={modalOpen}
        onOpenChange={handleOpenChange}
        onConnected={handleConnected}
        existing={status}
      />
    </N8nContext.Provider>
  );
}

export function useN8n() {
  const ctx = useContext(N8nContext);
  if (!ctx) throw new Error("useN8n must be used within N8nProvider");
  return ctx;
}
