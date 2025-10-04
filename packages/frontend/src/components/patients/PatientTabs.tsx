"use client";

import { useState } from "react";
import Demographics from "./tabs/Demographics";

const tabs = [
  { id: "demographics", label: "Demographics" },
  { id: "encounters", label: "Encounters &amp; Notes (Coming Soon)" },
  { id: "medications", label: "Medications (Coming Soon)" },
];

export default function PatientTabs({ patient }: { patient: any }) {
  const [activeTab, setActiveTab] = useState("demographics");

  return (
    <div>
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) =&gt; (
            <button
              key={tab.id}
              onClick={() =&gt; setActiveTab(tab.id)}
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
        {activeTab === "demographics" &amp;&amp; &lt;Demographics patient={patient} /&gt;}
        {activeTab === "encounters" &amp;&amp; (
          <div className="text-gray-500 italic">Encounters &amp; Notes feature coming soon...</div>
        )}
        {activeTab === "medications" &amp;&amp; (
          <div className="text-gray-500 italic">Medications feature coming soon...</div>
        )}
      </div>
    </div>
  );
}
