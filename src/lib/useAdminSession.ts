"use client";

import { useQuery } from "convex/react";
import { useCallback, useSyncExternalStore } from "react";
import { api } from "../../convex/_generated/api";

const STORAGE_KEY = "admin-token";

// localStorage is an external store; `storage` events only reach other tabs,
// so writes in this tab notify local subscribers explicitly.
const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function readToken() {
  return window.localStorage.getItem(STORAGE_KEY);
}

/** Nothing is readable during SSR, so the server always renders signed out. */
function readTokenOnServer(): string | null {
  return null;
}

function writeToken(token: string | null) {
  if (token) window.localStorage.setItem(STORAGE_KEY, token);
  else window.localStorage.removeItem(STORAGE_KEY);
  listeners.forEach((listener) => listener());
}

/**
 * Exposes the stored admin token together with the server's verdict on it,
 * so a forged or expired token never unlocks the review controls.
 */
export function useAdminSession() {
  const token = useSyncExternalStore(
    subscribe,
    readToken,
    readTokenOnServer
  );

  const isValid = useQuery(api.admin.isValid, { token });

  const signIn = useCallback((newToken: string) => writeToken(newToken), []);
  const signOut = useCallback(() => writeToken(null), []);

  return {
    token,
    isAdmin: isValid === true,
    checking: isValid === undefined,
    signIn,
    signOut,
  };
}
