"use client";

import { useEffect, useMemo, useState } from "react";

type Props = {
  openedAt: string;
  isClosed: boolean;
  onCloseClick: () => void;
};

const toDuration = (seconds: number) => {
  const safe = Math.max(0, seconds);
  const hours = Math.floor(safe / 3600)
    .toString()
    .padStart(2, "0");
  const minutes = Math.floor((safe % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const secs = Math.floor(safe % 60)
    .toString()
    .padStart(2, "0");
  return `${hours}:${minutes}:${secs}`;
};

export const ActiveEncounterHeader = ({ openedAt, isClosed, onCloseClick }: Props) => {
  const openedAtMs = useMemo(() => new Date(openedAt).getTime(), [openedAt]);
  const [elapsedSeconds, setElapsedSeconds] = useState(
    Math.floor((Date.now() - openedAtMs) / 1000),
  );

  useEffect(() => {
    if (isClosed) {
      return;
    }

    const interval = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - openedAtMs) / 1000));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [isClosed, openedAtMs]);

  return (
    <header
      className={`sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 shadow-sm ${
        isClosed
          ? "border-slate-300 bg-slate-100"
          : "border-red-300 bg-red-50"
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-slate-900">Encounter Clock</span>
        <span className="rounded bg-slate-900 px-2 py-1 font-mono text-xs text-white">
          {toDuration(elapsedSeconds)}
        </span>
      </div>

      <button
        type="button"
        data-primary-action="true"
        onClick={onCloseClick}
        disabled={isClosed}
        className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        {isClosed ? "Encounter Closed" : "Close & Sign Encounter"}
      </button>
    </header>
  );
};
