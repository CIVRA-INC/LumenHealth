"use client";

import { useCallback, useEffect, useState } from "react";
import type { Clinic, UpdateClinicRequest } from "@lumen/types";
import { useAuthSession } from "../../auth/session-provider";
import { fetchClinic, updateClinic } from "../api";

type Status = "idle" | "loading" | "saving" | "success" | "error";

export function ClinicSettingsForm() {
  const { session } = useAuthSession();
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (!session) return;
    setStatus("loading");
    fetchClinic(session.clinicId, session.accessToken)
      .then((c) => {
        setClinic(c);
        setName(c.name);
        setAddress(c.address);
        setPhone(c.phone);
        setEmail(c.email);
        setStatus("idle");
      })
      .catch((err) => {
        setErrorMessage(err instanceof Error ? err.message : "Failed to load clinic");
        setStatus("error");
      });
  }, [session]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!session || !clinic) return;

      const updates: UpdateClinicRequest = {};
      if (name !== clinic.name) updates.name = name;
      if (address !== clinic.address) updates.address = address;
      if (phone !== clinic.phone) updates.phone = phone;
      if (email !== clinic.email) updates.email = email;

      if (Object.keys(updates).length === 0) return;

      setStatus("saving");
      setErrorMessage("");

      try {
        const updated = await updateClinic(clinic.clinicId, updates, session.accessToken);
        setClinic(updated);
        setName(updated.name);
        setAddress(updated.address);
        setPhone(updated.phone);
        setEmail(updated.email);
        setStatus("success");
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : "Failed to save");
        setStatus("error");
      }
    },
    [session, clinic, name, address, phone, email],
  );

  if (!session) {
    return <p className="authLead">Sign in to manage clinic settings.</p>;
  }

  if (status === "loading") {
    return <p className="authLead">Loading clinic settings...</p>;
  }

  const canEdit = session.role === "owner" || session.role === "admin";

  return (
    <form className="authForm" onSubmit={handleSubmit}>
      <label>
        Clinic name
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={!canEdit}
          required
          placeholder="North Star Clinic"
        />
      </label>

      <label>
        Address
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          disabled={!canEdit}
          placeholder="123 Health Ave"
        />
      </label>

      <label>
        Phone
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          disabled={!canEdit}
          placeholder="+1 555-0100"
        />
      </label>

      <label>
        Email
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={!canEdit}
          placeholder="contact@clinic.test"
        />
      </label>

      {status === "success" && (
        <div className="authStatus authStatus--success">
          <p>Settings saved.</p>
        </div>
      )}

      {status === "error" && (
        <div className="authStatus">
          <p>{errorMessage}</p>
        </div>
      )}

      {canEdit && (
        <button type="submit" disabled={status === "saving"}>
          {status === "saving" ? "Saving..." : "Save changes"}
        </button>
      )}
    </form>
  );
}
