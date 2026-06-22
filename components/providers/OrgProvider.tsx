/**
 * OrgProvider — client context holding the active org id + role.
 *
 * The active org id is persisted in the `active_org_id` cookie (set by the
 * server when the user picks an org). This provider reads it from a server-
 * passed initial value and exposes a setter that calls /api/org/switch.
 *
 * @module components/providers/OrgProvider
 */
'use client';

import { createContext, useContext, useState, useCallback } from 'react';

interface OrgState {
  orgId: string | null;
  orgName: string;
  role: string;
}

interface OrgContextValue extends OrgState {
  switchOrg: (orgId: string) => Promise<void>;
  setLocal: (state: OrgState) => void;
}

const OrgContext = createContext<OrgContextValue | undefined>(undefined);

export function OrgProvider({
  children,
  initial,
}: {
  children: React.ReactNode;
  initial: OrgState;
}) {
  const [state, setState] = useState<OrgState>(initial);

  const switchOrg = useCallback(async (orgId: string) => {
    await fetch('/api/org/switch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
      body: JSON.stringify({ orgId }),
    });
    // Reload to re-fetch server data for the new org.
    window.location.reload();
  }, []);

  const setLocal = useCallback((s: OrgState) => setState(s), []);

  return (
    <OrgContext.Provider value={{ ...state, switchOrg, setLocal }}>
      {children}
    </OrgContext.Provider>
  );
}

export function useOrg(): OrgContextValue {
  const ctx = useContext(OrgContext);
  if (!ctx) throw new Error('useOrg must be used within OrgProvider');
  return ctx;
}
