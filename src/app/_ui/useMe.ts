"use client";
import { createContext, createElement, useCallback, useContext, useEffect, useState } from "react";
import { api, type Json } from "./api";

type Me = {
  id: number;
  name: string;
  email: string;
  role: "ADMIN" | "EMPLOYEE";
  designation: string;
  phone: string | null;
  isActive: boolean;
};

const MeContext = createContext<{ me: Me | null; setMe: (m: Me) => void; reload: () => void }>({
  me: null,
  setMe: () => {},
  reload: () => {},
});

/** Loads the current user once for the whole app shell (role-based UI only; the API enforces access). */
export function MeProvider({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const reload = useCallback(() => {
    api("/api/profile").then((m: Json) => setMe(m)).catch(() => {});
  }, []);
  useEffect(reload, [reload]);
  return createElement(MeContext.Provider, { value: { me, setMe, reload } }, children);
}

export function useMe() {
  return useContext(MeContext).me;
}

export function useMeContext() {
  return useContext(MeContext);
}

export const initials = (name?: string | null) =>
  (name ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("") || "?";
