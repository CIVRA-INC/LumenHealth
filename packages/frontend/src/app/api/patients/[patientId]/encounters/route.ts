import { NextRequest, NextResponse } from "next/server";
import { getDataSource } from "@/lib/db"; // Your TypeORM datasource helper
import { Encounter } from "@/lib/entities/Encounter";
import { Patient } from "@/lib/entities/Patient";

export async function POST(
  req: NextRequest,
  { params }: { params: { patientId: string } }
) {
  try {
    const body = await req.json();
    const ds = await getDataSource();

    const patientRepo = ds.getRepository(Patient);
    const encounterRepo = ds.getRepository(Encounter);

    const patient = await patientRepo.findOneBy({ id: params.patientId });
    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    const encounter = encounterRepo.create({
      patient,
      bloodPressure: body.bloodPressure,
      heartRate: body.heartRate,
      temperature: body.temperature,
      respiratoryRate: body.respiratoryRate,
      subjective: body.subjective,
      objective: body.objective,
      assessment: body.assessment,
      plan: body.plan,
      createdAt: new Date(),
    });

    await encounterRepo.save(encounter);

    return NextResponse.json(encounter, { status: 201 });
  } catch (err: any) {
    console.error("Error creating encounter:", err);
    return NextResponse.json({ error: "Failed to create encounter" }, { status: 500 });
  }
}
