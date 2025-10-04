import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft, Mail, Phone, MapPin, User } from "lucide-react"

export default function PatientProfilePage({ params }: { params: { id: string } }) {
  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
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
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Patient Profile</h1>
          <p className="text-muted-foreground mt-2">Patient ID: {params.id}</p>
        </div>

        <Card>
          <CardHeader className="bg-primary/5">
            <CardTitle className="text-2xl">Registration Successful!</CardTitle>
            <CardDescription>The patient has been successfully registered in the system</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-6">
              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Patient Information</p>
                  <p className="text-base text-foreground">Full patient details are now available in the system</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Contact Methods</p>
                  <p className="text-base text-foreground">Phone and email information has been recorded</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Address</p>
                  <p className="text-base text-foreground">Residential address has been saved</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Emergency Contact</p>
                  <p className="text-base text-foreground">Emergency contact information is on file</p>
                </div>
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              <Link href="/dashboard/patients/new">
                <Button>Register Another Patient</Button>
              </Link>
              <Link href="/dashboard/patients">
                <Button variant="outline">View All Patients</Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Next Steps</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary font-semibold">1.</span>
                <span>Schedule an appointment for the patient</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-semibold">2.</span>
                <span>Collect insurance information if applicable</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-semibold">3.</span>
                <span>Review medical history during first visit</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
