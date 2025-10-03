"use client";

import { useForm } from "react-hook-form";
import { useState } from "react";

type EncounterFormData = {
  bloodPressure: string;
  heartRate: string;
  temperature: string;
  respiratoryRate: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
};

interface Props {
  patientId: string;
  onSuccess: () => void;
  onClose: () => void;
}

export default function NewEncounterForm({ patientId, onSuccess, onClose }: Props) {
  const { register, handleSubmit, reset } = useForm<EncounterFormData>();
  const [loading, setLoading] = useState(false);

  const onSubmit = async (data: EncounterFormData) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/patients/${patientId}/encounters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        reset();
        onSuccess();
        onClose();
      } else {
        console.error("Failed to save encounter", await res.text());
      }
    } catch (err) {
      console.error("Error saving encounter:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <h1 className="text-xl font-bold">New Clinical Encounter</h1>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Vitals Section */}
          <div>
            <h2 className="text-lg font-semibold">Vitals</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              <input
                type="text"
                placeholder="Blood Pressure"
                {...register("bloodPressure")}
                className="border p-2 rounded w-full"
              />
              <input
                type="text"
                placeholder="Heart Rate"
                {...register("heartRate")}
                className="border p-2 rounded w-full"
              />
              <input
                type="text"
                placeholder="Temperature (°C)"
                {...register("temperature")}
                className="border p-2 rounded w-full"
              />
              <input
                type="text"
                placeholder="Respiratory Rate"
                {...register("respiratoryRate")}
                className="border p-2 rounded w-full"
              />
            </div>
          </div>

          {/* Clinical Notes Section */}
          <div>
            <h2 className="text-lg font-semibold">Clinical Notes (SOAP)</h2>
            <textarea
              placeholder="Subjective"
              {...register("subjective")}
              className="border p-2 rounded w-full min-h-[100px] mt-2"
            />
            <textarea
              placeholder="Objective"
              {...register("objective")}
              className="border p-2 rounded w-full min-h-[100px] mt-2"
            />
            <textarea
              placeholder="Assessment"
              {...register("assessment")}
              className="border p-2 rounded w-full min-h-[100px] mt-2"
            />
            <textarea
              placeholder="Plan"
              {...register("plan")}
              className="border p-2 rounded w-full min-h-[100px] mt-2"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded"
            >
              {loading ? "Saving..." : "Save Encounter"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
