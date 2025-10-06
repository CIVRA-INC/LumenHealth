"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import PatientTabs from "./PatientTabs";

interface PatientProfileProps {
  patientId: string;
}

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

export default function PatientProfile({ patientId }: PatientProfileProps) {
  const { data: patient, isLoading, error } = useQuery<Patient>({
    queryKey: [`/api/patients/${patientId}`],
  });

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        <div className="text-gray-500">Loading patient data...</div>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        <div className="mb-6">
          <Link href="/dashboard/patients">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Patients
            </Button>
          </Link>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>Failed to load patient data</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Patient not found or there was an error loading the data.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-6">
        <Link href="/dashboard/patients">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Patients
          </Button>
        </Link>
      </div>

      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {patient?.firstName} {patient?.lastName}
          </h1>
          <p className="text-muted-foreground mt-2">Patient ID: {patient?.id}</p>
        </div>

        {patient && <PatientTabs patient={patient} />}
      </div>
    </div>
  );
}
