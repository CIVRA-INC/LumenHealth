"use client";

type Props = {
  isOpen: boolean;
  isSubmitting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export const CloseEncounterModal = ({ isOpen, isSubmitting, onCancel, onConfirm }: Props) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
      <div className="w-full max-w-lg rounded-xl border border-red-200 bg-white p-5 shadow-xl">
        <h2 className="text-lg font-semibold text-slate-900">Close & Sign Encounter</h2>
        <p className="mt-2 text-sm text-slate-700">
          This action is irreversible. Once closed, this encounter is locked for compliance and
          medical auditability.
        </p>

        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          Confirm only after all notes and vitals are complete.
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="rounded bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {isSubmitting ? "Closing..." : "Confirm Close"}
          </button>
        </div>
      </div>
    </div>
  );
};
