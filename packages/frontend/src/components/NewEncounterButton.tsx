"use client";

import { useState } from "react";
import NewEncounterForm from "./NewEncounterForm";

export default function NewEncounterButton({ patientId }: { patientId: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        New Encounter
      </button>

      {open && (
        <NewEncounterForm
          patientId={patientId}
          onSuccess={() => {
            // Could trigger SWR/React Query revalidation here
            console.log("Encounter saved");
          }}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
