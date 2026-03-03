"use client";

export const EncounterLockOverlay = ({ isLocked }: { isLocked: boolean }) => {
  if (!isLocked) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-20 rounded-xl border border-slate-300 bg-slate-200/55">
      <div className="absolute left-4 top-4 rounded-md border border-slate-400 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
        Locked: Encounter is closed and read-only
      </div>
    </div>
  );
};
