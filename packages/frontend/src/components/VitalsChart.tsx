"use client";

import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Encounter, VitalData } from "@/types/encounter";

interface VitalsChartProps {
  encounters: Encounter[];
}

export default function VitalsChart({ encounters }: VitalsChartProps) {
  const chartData = useMemo(() => {
    return encounters.map((encounter) => {
      const data: VitalData = {
        date: new Date(encounter.createdAt).toLocaleDateString(),
      };

      // Parse blood pressure (format: "120/80")
      if (encounter.bloodPressure) {
        const bpParts = encounter.bloodPressure.split("/");
        if (bpParts.length === 2) {
          data.systolic = parseInt(bpParts[0], 10);
          data.diastolic = parseInt(bpParts[1], 10);
        }
      }

      // Parse heart rate
      if (encounter.heartRate) {
        const hr = parseInt(encounter.heartRate, 10);
        if (!isNaN(hr)) {
          data.heartRate = hr;
        }
      }

      return data;
    });
  }, [encounters]);

  if (encounters.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No encounter data available to display vitals chart
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Blood Pressure Chart */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Blood Pressure Trends</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              label={{ value: "Date", position: "insideBottom", offset: -5 }}
            />
            <YAxis
              label={{ value: "BP (mmHg)", angle: -90, position: "insideLeft" }}
            />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="systolic"
              stroke="#ef4444"
              name="Systolic"
              strokeWidth={2}
              dot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="diastolic"
              stroke="#3b82f6"
              name="Diastolic"
              strokeWidth={2}
              dot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Heart Rate Chart */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Heart Rate Trends</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              label={{ value: "Date", position: "insideBottom", offset: -5 }}
            />
            <YAxis
              label={{ value: "BPM", angle: -90, position: "insideLeft" }}
            />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="heartRate"
              stroke="#10b981"
              name="Heart Rate"
              strokeWidth={2}
              dot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
