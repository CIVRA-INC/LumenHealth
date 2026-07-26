'use client';

import React from 'react';

export interface PatientIdentityCardProps {
  patientId: string;
  fullName: string;
  nationalId: string;
  status: string;
}

export function PatientIdentityCard({ patientId, fullName, nationalId, status }: PatientIdentityCardProps) {
  return (
    <div className="p-4 rounded-xl border border-gray-200 bg-white shadow-sm space-y-2">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-gray-900">{fullName}</h3>
        <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800">
          {status}
        </span>
      </div>
      <p className="text-xs text-gray-500">ID: {patientId} | National ID: {nationalId}</p>
    </div>
  );
}
