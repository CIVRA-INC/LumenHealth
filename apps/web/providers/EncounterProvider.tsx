"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type EncounterContextValue = {
  activeEncounterId: string | null;
  setActiveEncounterId: (encounterId: string | null) => void;
};

const STORAGE_KEY = "lumen.activeEncounterId";

const EncounterContext = createContext<EncounterContextValue | null>(null);

export const EncounterProvider = ({ children }: { children: React.ReactNode }) => {
  const searchParams = useSearchParams();
  const [activeEncounterId, setActiveEncounterIdState] = useState<string | null>(null);

  useEffect(() => {
    const encounterIdFromUrl = searchParams.get("encounterId");
    if (encounterIdFromUrl) {
      setActiveEncounterIdState(encounterIdFromUrl);
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    const storedEncounterId = window.localStorage.getItem(STORAGE_KEY);
    if (storedEncounterId) {
      setActiveEncounterIdState(storedEncounterId);
    }
  }, [searchParams]);

  const setActiveEncounterId = (encounterId: string | null) => {
    setActiveEncounterIdState(encounterId);

    if (typeof window === "undefined") {
      return;
    }

    if (encounterId) {
      window.localStorage.setItem(STORAGE_KEY, encounterId);
      return;
    }

    window.localStorage.removeItem(STORAGE_KEY);
  };

  const value = useMemo(
    () => ({
      activeEncounterId,
      setActiveEncounterId,
    }),
    [activeEncounterId],
  );

  return <EncounterContext.Provider value={value}>{children}</EncounterContext.Provider>;
};

export const useEncounter = () => {
  const context = useContext(EncounterContext);
  if (!context) {
    throw new Error("useEncounter must be used within EncounterProvider");
  }

  return context;
};
