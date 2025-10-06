"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Demographics from "./tabs/Demographics";
import VitalsChart from "../VitalsChart";
import { Encounter } from "@/types/encounter";

const tabs = [
  { id: "demographics", label: "Demographics" },
  { id: "vitals", label: "Vitals Chart" },
  { id: "encounters", label: "Encounters & Notes (Coming Soon)" },
  { id: "medications", label: "Medications (Coming Soon)" },
];

type Patient = {
  id?: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string | Date;
  gender?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelationship?: string;
};

export default function PatientTabs({ patient }: { patient: Patient }) {
  const [activeTab, setActiveTab] = useState("demographics");

  const { data: encounters = [], isLoading } = useQuery<Encounter[]>({
    queryKey: [`/api/patients/${patient?.id}/encounters`],
    enabled: !!patient?.id,
  });

  return (
    <div>
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === "demographics" && <Demographics patient={patient} />}
        {activeTab === "vitals" && (
          isLoading ? (
            <div className="text-gray-500">Loading vitals data...</div>
          ) : (
            <VitalsChart encounters={encounters} />
          )
        )}
        {activeTab === "encounters" && (
          <div className="text-gray-500 italic">Encounters & Notes feature coming soon...</div>
        )}
        {activeTab === "medications" && (
          <div className="text-gray-500 italic">Medications feature coming soon...</div>
        )}
      </div>
    </div>
  );
}
