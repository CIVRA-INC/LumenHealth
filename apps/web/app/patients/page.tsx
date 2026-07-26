"use client";

import { useState } from "react";
import type { PatientDemographics, PatientListResponse } from "../../src/types/patient-demographics.types";

const GENDER_OPTIONS = ["", "male", "female", "non_binary", "other", "prefer_not_to_say"] as const;

export default function PatientListPage() {
  const [search, setSearch] = useState("");
  const [gender, setGender] = useState("");
  const [results, setResults] = useState<PatientDemographics[]>([]);
  const [loading, setLoading] = useState(false);

  async function handleSearch() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: "1", pageSize: "20" });
      if (search) params.set("search", search);
      if (gender) params.set("gender", gender);
      const res = await fetch(`/api/v1/patients?${params}`);
      const body: PatientListResponse = await res.json();
      setResults(body.patients);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="authPage">
      <h1>Patients</h1>

      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
        <input
          type="text"
          placeholder="Search by name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={gender} onChange={(e) => setGender(e.target.value)}>
          {GENDER_OPTIONS.map((g) => (
            <option key={g} value={g}>
              {g || "All genders"}
            </option>
          ))}
        </select>
        <button onClick={handleSearch} disabled={loading}>
          Search
        </button>
      </div>

      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>DOB</th>
            <th>Gender</th>
            <th>MRN</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {results.map((p) => (
            <tr key={p.patientId}>
              <td>
                {p.firstName} {p.lastName}
              </td>
              <td>{p.dateOfBirth}</td>
              <td>{p.gender}</td>
              <td>{p.medicalRecordNumber}</td>
              <td>
                <a href={`/patients/${p.patientId}`}>View</a>
              </td>
            </tr>
          ))}
          {results.length === 0 && !loading && (
            <tr>
              <td colSpan={5}>No patients found.</td>
            </tr>
          )}
        </tbody>
      </table>
    </main>
  );
}
