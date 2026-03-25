"use client";

import { createContext, useContext, useEffect, useState } from "react";

type EncounterContextValue = {
  activeEncounterId: string | null;
  setActiveEncounterId: (id: string | null) => void;
};

const EncounterContext = createContext<EncounterContextValue | null>(null);

export const EncounterProvider = ({ children }: { children: React.ReactNode }) => {
  const [activeEncounterId, setActiveEncounterId] = useState<string | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem("lumen.active_encounter");
    if (stored) {
      setActiveEncounterId(stored);
    }
  }, []);

  const updateActiveEncounter = (id: string | null) => {
    setActiveEncounterId(id);
    if (id) {
      window.localStorage.setItem("lumen.active_encounter", id);
    } else {
      window.localStorage.removeItem("lumen.active_encounter");
    }
  };

  return (
    <EncounterContext.Provider
      value={{ activeEncounterId, setActiveEncounterId: updateActiveEncounter }}
    >
      {children}
    </EncounterContext.Provider>
  );
};

export const useEncounter = () => {
  const ctx = useContext(EncounterContext);
  if (!ctx) {
    throw new Error("useEncounter must be used within EncounterProvider");
  }
  return ctx;
};
