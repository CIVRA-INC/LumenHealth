import { PatientRegistrationForm } from "@/components/patientRegForm"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function NewPatientPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">New Patient Registration</h1>
        <p className="text-muted-foreground mt-2">
          Register a new patient by filling out the form below. All fields marked with * are required.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Patient Information</CardTitle>
          <CardDescription>Please ensure all information is accurate and complete</CardDescription>
        </CardHeader>
        <CardContent>
          <PatientRegistrationForm />
        </CardContent>
      </Card>
    </div>
  )
}
